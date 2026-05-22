"""
Exam JSON Schema Specification

This module defines the complete JSON structure for exam/test definitions.
Supports multiple question types, LaTeX math, media, and advanced features.

Example usage:
    with open("linear_algebra_exam.json") as f:
        exam_data = json.load(f)
    exam_json = ExamJSONSchema.parse_obj(exam_data)
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from datetime import datetime


class QuestionType(str, Enum):
    """Question type enumeration."""
    MULTIPLE_CHOICE = "multiple_choice"      # Multiple correct answers
    SINGLE_CHOICE = "single_choice"          # One correct answer only
    ESSAY = "essay"                          # Long text (unlimited)
    SHORT_ANSWER = "short_answer"            # Brief text (< 500 chars)
    MATHEMATICAL = "mathematical"            # Math expression/formula
    CODE = "code"                            # Code snippet
    MATCHING = "matching"                    # Match columns
    TRUE_FALSE = "true_false"                # Boolean answer
    FILL_BLANK = "fill_blank"                # Fill in the blank


class DifficultyLevel(str, Enum):
    """Question difficulty."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class OptionModel(BaseModel):
    """Answer option for choice-based questions."""
    id: str                                   # Unique ID within question
    text: str                                 # Display text
    latex: Optional[str] = None               # Optional LaTeX formula
    image_url: Optional[str] = None           # Optional image


class MatchingPair(BaseModel):
    """Pair for matching questions."""
    left_id: str
    left_text: str
    left_latex: Optional[str] = None
    right_id: str
    right_text: str
    right_latex: Optional[str] = None


class BaseQuestion(BaseModel):
    """Base question model with common fields."""
    id: str                                   # Unique question ID
    type: QuestionType
    question_text: str                        # Main question text
    question_latex: Optional[str] = None      # Optional LaTeX in question
    
    # Metadata
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    points: float = Field(default=1.0, ge=0)
    
    # Options
    required: bool = True
    show_instructions: Optional[str] = None
    
    # Media
    images: List[str] = Field(default_factory=list)         # Image URLs
    code_block: Optional[str] = None                         # Code context


class MultipleChoiceQuestion(BaseQuestion):
    """Multiple choice: select all correct answers."""
    type: QuestionType = QuestionType.MULTIPLE_CHOICE
    options: List[OptionModel]
    correct_answer_ids: List[str]             # IDs of correct options
    partial_credit: bool = False              # Award partial points?


class SingleChoiceQuestion(BaseQuestion):
    """Single choice: select one correct answer."""
    type: QuestionType = QuestionType.SINGLE_CHOICE
    options: List[OptionModel]
    correct_answer_id: str                    # ID of the correct option


class EssayQuestion(BaseQuestion):
    """Essay: long text response."""
    type: QuestionType = QuestionType.ESSAY
    min_words: Optional[int] = None
    max_words: Optional[int] = None
    rubric: Optional[Dict[str, Any]] = None   # Grading rubric (manual)


class ShortAnswerQuestion(BaseQuestion):
    """Short answer: text response (auto-gradable)."""
    type: QuestionType = QuestionType.SHORT_ANSWER
    correct_answers: List[str]                # Acceptable answers (case-insensitive)
    max_length: int = 500


class MathematicalQuestion(BaseQuestion):
    """Mathematical: accept math expressions."""
    type: QuestionType = QuestionType.MATHEMATICAL
    correct_answer_latex: str                 # Expected LaTeX answer
    decimal_tolerance: float = 0.01           # For numeric answers
    allow_simplification: bool = True         # Accept equivalent forms?


class CodeQuestion(BaseQuestion):
    """Code: write and execute code."""
    type: QuestionType = QuestionType.CODE
    language: str                             # python, javascript, etc.
    template_code: Optional[str] = None       # Starting code
    test_cases: List[Dict[str, Any]] = Field(default_factory=list)  # Input/output tests


class MatchingQuestion(BaseQuestion):
    """Matching: connect left column to right."""
    type: QuestionType = QuestionType.MATCHING
    pairs: List[MatchingPair]
    correct_matches: Dict[str, str]           # {"left_id": "right_id", ...}


class TrueFalseQuestion(BaseQuestion):
    """True/False: boolean answer."""
    type: QuestionType = QuestionType.TRUE_FALSE
    correct_answer: bool                      # True or False


class FillBlankQuestion(BaseQuestion):
    """Fill in the blank: text completion."""
    type: QuestionType = QuestionType.FILL_BLANK
    passage: str                              # Text with blanks marked as [___]
    blanks: List[Dict[str, Any]]             # Blank definitions and answers


# Union type for all question types
AnyQuestion = Union[
    MultipleChoiceQuestion,
    SingleChoiceQuestion,
    EssayQuestion,
    ShortAnswerQuestion,
    MathematicalQuestion,
    CodeQuestion,
    MatchingQuestion,
    TrueFalseQuestion,
    FillBlankQuestion,
]


class QuestionSection(BaseModel):
    """Grouping of related questions."""
    id: str
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    questions: List[AnyQuestion]


class ScoringRule(BaseModel):
    """Custom scoring configuration."""
    type: str                                 # "all_or_nothing", "partial", "custom"
    penalty_for_wrong: float = 0.0
    bonus_for_correct: float = 0.0


class ExamSettings(BaseModel):
    """Exam-wide configuration and rules."""
    allow_navigation: bool = True             # Can skip/revisit?
    allow_review_before_submit: bool = False  # Can review answers?
    show_correct_answers: bool = False        # After exam ends?
    randomize_questions: bool = False
    randomize_options: bool = False
    prevent_tab_switch: bool = False          # Fullscreen/focus enforcement?
    require_fullscreen: bool = False
    proctoring_enabled: bool = False
    shuffle_sections: bool = False


class ExamMetadata(BaseModel):
    """Exam information."""
    created_by: str
    created_date: datetime
    version: str = "1.0"
    language: str = "en"


class ExamJSONSchema(BaseModel):
    """
    Complete exam definition schema.
    Top-level structure for exam JSON files.
    """
    # Metadata
    id: Optional[str] = None                  # UUID generated on upload
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    
    # Timing — optional in JSON (ignored); window starts when admin activates the exam
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int = Field(default=60, ge=1, le=480)  # default 1 hour
    
    # Content
    sections: Optional[List[QuestionSection]] = None
    questions: Optional[List[AnyQuestion]] = None
    
    # Configuration
    settings: ExamSettings = Field(default_factory=ExamSettings)
    scoring: ScoringRule = Field(default_factory=lambda: ScoringRule(type="all_or_nothing"))
    
    # Access control
    max_attempts: int = Field(default=1, ge=1)
    access_token: Optional[str] = None        # Optional access code
    allowed_student_ids: List[int] = Field(default_factory=list)  # Empty = all
    
    # Metadata
    metadata: Optional[ExamMetadata] = None
    
    @model_validator(mode="after")
    def validate_exam(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        if self.get_question_count() < 1:
            raise ValueError("At least one question is required in questions or sections")
        return self
    
    def get_total_points(self) -> float:
        """Calculate total exam points."""
        questions = self.questions or []
        if self.sections:
            for section in self.sections:
                questions.extend(section.questions)
        return sum(q.points for q in questions)
    
    def get_question_count(self) -> int:
        """Get total question count."""
        questions = self.questions or []
        if self.sections:
            for section in self.sections:
                questions.extend(section.questions)
        return len(questions)


# Example exam JSON
EXAMPLE_EXAM_JSON = {
    "title": "Linear Algebra Fundamentals",
    "description": "Comprehensive exam on vectors, matrices, and transformations",
    "instructions": "Answer all questions. Show your work for mathematical problems.",
    "duration_minutes": 60,
    "max_attempts": 2,
    "settings": {
        "allow_navigation": True,
        "allow_review_before_submit": False,
        "show_correct_answers": False,
        "randomize_questions": False,
        "randomize_options": True,
    },
    "sections": [
        {
            "id": "section1",
            "title": "Vector Concepts",
            "description": "Basic vector operations and properties",
            "questions": [
                {
                    "id": "q1",
                    "type": "single_choice",
                    "question_text": "What is the magnitude of the vector v = (3, 4)?",
                    "question_latex": "If $\\vec{v} = (3, 4)$, what is $|\\vec{v}|$?",
                    "difficulty": "easy",
                    "points": 1,
                    "options": [
                        {"id": "opt1", "text": "5"},
                        {"id": "opt2", "text": "7"},
                        {"id": "opt3", "text": "25"},
                        {"id": "opt4", "text": "√7"},
                    ],
                    "correct_answer_id": "opt1",
                },
                {
                    "id": "q2",
                    "type": "mathematical",
                    "question_text": "Compute the dot product of vectors u=(1,2,3) and v=(4,5,6)",
                    "question_latex": "Compute $\\vec{u} \\cdot \\vec{v}$ where $\\vec{u} = (1,2,3)$ and $\\vec{v} = (4,5,6)$",
                    "difficulty": "medium",
                    "points": 2,
                    "correct_answer_latex": "32",
                    "decimal_tolerance": 0.01,
                },
            ]
        },
        {
            "id": "section2",
            "title": "Essay Section",
            "questions": [
                {
                    "id": "q3",
                    "type": "essay",
                    "question_text": "Explain the geometric interpretation of the cross product in 3D space.",
                    "difficulty": "hard",
                    "points": 5,
                    "min_words": 100,
                    "max_words": 500,
                }
            ]
        }
    ],
}
