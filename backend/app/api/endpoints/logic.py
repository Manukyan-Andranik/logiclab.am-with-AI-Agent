import re
import os
import json
import logging
import dotenv
import ast
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.core.config import settings

from deep_translator import GoogleTranslator as TRANSLATOR


from gradio_client import Client

agent_client = None

def get_agent_client():
    global agent_client
    if agent_client is None:
        logger.info("Initializing Logic Agent client")
        try:
            agent_client = Client("LogicLabAcademy/Logic_Agnet")
        except Exception as e:
            logger.exception("Failed to initialize Logic Agent client: %s", e)
            raise e
    return agent_client

os.environ["TOKENIZERS_PARALLELISM"] = "false"


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
    try:
        result = client.predict(
            message=question,
            system_message=context,
            max_tokens=512,
            temperature=0.7,
            top_p=0.95,
            api_name="/respond"
        )
    except Exception as e:
        logger.exception("Error calling Gradio client: %s", e)
        return "Ցավոք, կապի խնդիր առաջացավ։", {}

    # Ensure result is a string
    if isinstance(result, (list, tuple)) and len(result) > 0:
        result = str(result[0])
    elif not isinstance(result, str):
        result = str(result) if result is not None else ""

    parsed_json = {}
    clean_text = result
    
    if result:
        json_match = re.search(r"<JSON>(.*?)</JSON>", result, re.DOTALL)
        if json_match:
            json_str = json_match.group(1).strip()
            try:
                parsed_json = json.loads(json_str)
            except Exception as e:
                logger.warning("JSON standard parsing failed: %s", e)
                try:
                    # Fallback for cases where AI might use single quotes
                    parsed_json = ast.literal_eval(json_str)
                    if not isinstance(parsed_json, dict):
                        parsed_json = {}
                except Exception as e2:
                    logger.warning("JSON literal_eval fallback failed: %s", e2)
                    parsed_json = {}
            clean_text = result.replace(json_match.group(0), "").strip()
        else:
            clean_text = result
    else:
        clean_text = ""

    # Translate back to Armenian if it contains English and doesn't look like code
    translated_clean_answer = clean_text
    if clean_text and any(ord(c) < 128 for c in clean_text):
        try:
            translator = TRANSLATOR(source='en', target='hy')
            # Only translate if it's substantial text
            if len(clean_text) > 2:
                translated_clean_answer = translator.translate(clean_text)
        except Exception as te:
            logger.warning("Translation failed: %s", te)
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
    # Check if Logic Agent is enabled via NAVIGATION_SYSTEM config
    if settings.NAVIGATION_SYSTEM == "TRADITIONAL":
        raise HTTPException(
            status_code=403,
            detail="Logic Agent is not available in TRADITIONAL navigation mode."
        )
    
    # Construct conversation
    conversation = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m.role, "content": m.content} for m in request.history],
        {"role": "user", "content": request.message},
    ]
    
    # Get client lazily
    client = get_agent_client()
    
    clean_text, parsed_json = generate_answer_with_agent(question=request.message, context=SYSTEM_PROMPT, client=client)

    intent = parsed_json.get("intent")
    logger.debug("[AI] Intent: %s", intent)

    return LogicAgentResponse(
        text=clean_text,
        intent=intent,
        course_id=parsed_json.get("course_id"),
        learning_path=parsed_json.get("learning_path"),
        extracted=parsed_json.get("extracted"),
    )