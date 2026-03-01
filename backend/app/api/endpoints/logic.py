from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import json
import os
import re
import dotenv

dotenv.load_dotenv()

router = APIRouter()

# --- Schemas ---
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]


class LogciAgentResponse(BaseModel):
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
- ai: AI Tools (ԱԲ Գործիքներ)
- ml: Machine Learning Basics (Մեքենայական Ուսուցման Հիմունքներ)
- ml-advanced: Advanced Machine Learning (Խորացված Մեքենայական Ուսուցում)
- python: Python Programming
- web: Web Development (WEB ծրագրավորում)
- math: Mathematics for AI/ML
- 3dsmax: 3D Modeling (3D մոդելավորում, դիզայն)
- data-viz: Data Visualization
- photography: Photography (Լւոսանկարչություն)

### GUIDELINES:
- Language: Respond in Armenian or English, matching the user's tone and language.
- Context: If a user asks "Who are the teachers?", use intent 'instructors'. If they ask "Show me what students made", use 'projects'.
- JSON: ALWAYS conclude with a <JSON>...</JSON> block.

JSON Structure:
{
  "intent": "intent_string",
  "course_id": "optional_course_id",
  "extracted": {
    "age": null,
    "interest": "string",
    "level": "beginner|intermediate|advanced",
    "background": "string"
  },
  "learning_path": ["id1", "id2"],
  "message": "internal_label"
}
"""


@router.post("/chat", response_model=LogciAgentResponse)
async def logic_chat(request: ChatRequest):

    openai_key = os.getenv("OPENAI_API_KEY")

    if not openai_key:
        return LogciAgentResponse(
            text="Welcome to LogicLab. I am Logic Agent. How can I help you today?",
            intent="home"
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m.role, "content": m.content} for m in request.history],
        {"role": "user", "content": request.message},
    ]

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 800,
                },
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.text
                )

            data = response.json()

            full_text = data["choices"][0]["message"]["content"]

            # --- Extract JSON block ---
            json_match = re.search(r"<JSON>(.*?)</JSON>", full_text, re.DOTALL)
            parsed_json = {}

            if json_match:
                try:
                    parsed_json = json.loads(json_match.group(1).strip())
                except json.JSONDecodeError:
                    pass

            clean_text = re.sub(
                r"<JSON>.*?</JSON>", "", full_text, flags=re.DOTALL
            ).strip()

            return LogciAgentResponse(
                text=clean_text,
                intent=parsed_json.get("intent"),
                course_id=parsed_json.get("course_id"),
                learning_path=parsed_json.get("learning_path"),
                extracted=parsed_json.get("extracted"),
            )

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))