import re
import os
import json
import dotenv
import ast
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel, LoraConfig, get_peft_model, TaskType

from deep_translator import GoogleTranslator as TRANSLATOR


from gradio_client import Client

agent_client = Client("LogicLabAcademy/Logic_Agnet")

torch.set_num_threads(1)
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"


def load_model_and_tokenizer(model_name=None, mode="eval", BASE_MODEL_NAME="gpt2", DEVICE=None):

    if DEVICE is None:
        DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

    # Case 1: None or invalid path -> create empty LoRA GPT-2
    if model_name is None or not os.path.exists(model_name):
        print("No valid model found. Creating empty LoRA GPT-2 model...")

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
        tokenizer.pad_token = tokenizer.eos_token

        # Load base GPT-2
        base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL_NAME)
        base_model.config.use_cache = False
        base_model.to(DEVICE)

        # Create empty LoRA
        lora_config = LoraConfig(
            r=64,
            lora_alpha=128,
            lora_dropout=0.5,
            bias="none",
            task_type=TaskType.SEQ_2_SEQ_LM,
            target_modules=["c_attn", "c_proj"],
        )
        model = get_peft_model(base_model, lora_config)
        model.print_trainable_parameters()
        if mode == "train":
            model.train()
        else:
            model.eval()
        return model, tokenizer

    # Case 2: Load existing LoRA adapter
    print(f"Loading LoRA model from: {model_name}")

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL_NAME)
    base_model.config.use_cache = False

    # is_trainable=True ensures LoRA weights are attached for training
    is_trainable = mode == "train"
    model = PeftModel.from_pretrained(base_model, model_name, is_trainable=is_trainable)

    model.to(DEVICE)
    if mode == "train":
        model.train()
    else:
        model.eval()

    return model, tokenizer

# Use absolute path relative to this file
# MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "logic_agent_1")
# AGENT, TOKENIXER = load_model_and_tokenizer(model_name=MODEL_DIR, mode="eval")

import re

def format_answer(decoded: str) -> str:
    """
    Extract the assistant completion and return a clean answer block.
    """

    # 1️⃣ Try to extract after "Assistant: completion:"
    match = re.search(
        r"Assistant\s*:\s*completion\s*:?\s*(.*)",
        decoded,
        re.IGNORECASE | re.DOTALL
    )

    if match:
        answer = match.group(1).strip()
    else:
        # 2️⃣ Fallback: Extract answer after "Answer:"
        match = re.search(r"Answer:\s*(.*)", decoded, re.IGNORECASE | re.DOTALL)

        if match:
            answer = match.group(1).strip()
        else:
            answer = decoded.strip()

    # 3️⃣ Stop if model starts another section
    for stop_token in ["</JSON>"]:
        if stop_token in answer:
            answer = answer.split(stop_token)[0].strip()

    return answer + "\n</JSON>"

def generate_answer_with_agent(question: str, context: str, client, max_new_tokens: int = 64, temperature: float = 0.3):
    result = client.predict(
	message=question,
	system_message=context,
	max_tokens=512,
	temperature=0.7,
	top_p=0.95,
	api_name="/respond"
    )
    parsed_json = {}
    if result:
        json_match = re.search(r"<JSON>(.*?)</JSON>", result, re.DOTALL)
        if json_match:
            json_str = json_match.group(1).strip()
            try:
                parsed_json = json.loads(json_str)
            except Exception as e:
                print(f"JSON standard parsing failed: {e}")
                try:
                    # Fallback for cases where AI might use single quotes
                    parsed_json = ast.literal_eval(json_str)
                    if not isinstance(parsed_json, dict):
                        parsed_json = {}
                except Exception as e2:
                    print(f"JSON literal_eval fallback failed: {e2}")
                    parsed_json = {}
            clean_text = result.replace(json_match.group(0), "").strip()
        else:
            clean_text = result
    else:
        clean_text = result

    translated_clean_answer = clean_text
    return translated_clean_answer, parsed_json



dotenv.load_dotenv()
router = APIRouter()


# --- Schemas ---
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]


class LogicAgentResponse(BaseModel):
    text: str
    intent: Optional[str] = None
    course_id: Optional[str] = None
    learning_path: Optional[List[str]] = None
    extracted: Optional[Dict[str, Any]] = None


# --- AI Agent Logic ---
SYSTEM_PROMPT = """You are Logic Agent, the AI guide for LogicLab. Your mission is to provide seamless navigation and expert info about our platform's futuristic educational offerings.

### APPLICATION FUNCTIONAL STRUCTURE & ROUTING:
1. LANDING PAGE (Route: '/')
   - Featured Courses (Section: '#courses')
   - About Preview (Section: '#about')
   - Expert Instructors (Section: '#instructors')
   - Student Projects (Section: '#projects')
   - Success Stories (Section: '#success')
   - Contact Form (Section: '#contact')

2. SPECIALIZED PAGES:
   - Full Courses List (Route: '/courses')
   - Course Details (Route: '/courses/:id') - Use for specific course IDs below.
   - About Detailed (Route: '/about')
   - Registration (Route: '/register') - For signing up/enrolling.

### INTENTS:
- home: Go to Landing Page ('/').
- courses: Go to Full Courses List ('/courses').
- course_detail: Go to specific course details (REQUIRES 'course_id').
- about: Go to About page ('/about').
- instructors: Scroll to Instructors section on Home ('#instructors').
- projects: Scroll to Projects section on Home ('#projects').
- success: Scroll to Success Stories section on Home ('#success').
- contact: Scroll to Contact section on Home ('#contact').
- register: Go to Registration page ('/register').
- learning_path: Provide personalized course recommendations.

### COURSE IDs:
- ai, ml, ml-advanced, web, 3dsmax, photography

### MANDATORY JSON FORMAT:
You MUST ALWAYS end your response with a JSON block wrapped in <JSON> tags.
Example:
<JSON>
{
  "intent": "register",
  "course_id": null
}
</JSON>

### GUIDELINES:
- Language: English.
- Context: If they want to sign up or enroll, ALWAYS use 'register' intent.
"""

def format_prompt(question, context):
    prompt = (
        "You are a friendly assistant. Use the context to answer the question clearly and concisely.\n"
        f"Context: {context}\n"
        f"Question: {question}\n"
        "Answer:"
    )
    return prompt

@router.post("/chat", response_model=LogicAgentResponse)
async def logic_chat(request: ChatRequest):
    # Construct conversation
    conversation = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m.role, "content": m.content} for m in request.history],
        {"role": "user", "content": request.message},
    ]
    clean_text, parsed_json = generate_answer_with_agent(question=request.message, context=SYSTEM_PROMPT, client=agent_client)

    intent = parsed_json.get("intent")
    print(f"[AI] Intent: {intent}")

    return LogicAgentResponse(
        text=clean_text,
        intent=intent,
        course_id=parsed_json.get("course_id"),
        learning_path=parsed_json.get("learning_path"),
        extracted=parsed_json.get("extracted"),
    )