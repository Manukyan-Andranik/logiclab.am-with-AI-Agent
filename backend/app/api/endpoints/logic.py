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
SYSTEM_PROMPT = """You are Logic Agent, the AI navigation agent for LogicLab — a futuristic educational platform offering courses in Machine Learning, Artificial Intelligence, and Web Development.

Your role: Understand what the user wants, extract structured info, and route them to the right content.

Available intents:
- home
- courses
- course_detail
- about
- instructors # section on a home page 
- projects # section on a home page
- contact
- learning_path

Available course IDs: 1 (ai-fundamentals), 2 (ml-engineering), 3 (deep-learning), 4 (python-basics), 5 (web-ai), 6 (math-ml)

When responding, ALWAYS include:
1. A conversational reply (1-3 sentences)
2. A JSON block at the END wrapped in <JSON>...</JSON>

JSON structure:
{
  "intent": "one_of_the_intents_above",
  "course_id": "optional_course_id",
  "extracted": {
    "age": null,
    "interest": null,
    "level": null,
    "background": null
  },
  "learning_path": null,
  "message": "short label"
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