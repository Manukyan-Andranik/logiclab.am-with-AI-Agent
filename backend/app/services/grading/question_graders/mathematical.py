from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from sympy import simplify
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from ..base import BaseQuestionGrader
from ..normalization import to_decimal
from ..types import CORRECTNESS_PENDING, QuestionGradeOutcome


class MathematicalGrader(BaseQuestionGrader):
    """
    Mathematical grading: expression, number, choice, or matrix.
    """

    question_type = "mathematical"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        qid = question.get("id", "")

        if question.get("manual_grading"):
            return QuestionGradeOutcome(
                question_id=qid,
                earned_points=None,
                max_points=max_pts,
                correctness=CORRECTNESS_PENDING,
                is_correct_legacy=None,
            )

        if answer_data is None:
            return QuestionGradeOutcome(
                question_id=qid,
                earned_points=Decimal("0"),
                max_points=max_pts,
                correctness="incorrect",
                is_correct_legacy=False,
            )

        math_type = question.get("math_type", "expression")

        if math_type == "expression":
            return self._grade_expression(question, answer_data, max_pts, qid)
        elif math_type == "number":
            return self._grade_number(question, answer_data, max_pts, qid)
        elif math_type == "choice":
            return self._grade_choice(question, answer_data, max_pts, qid)
        elif math_type == "matrix":
            return self._grade_matrix(question, answer_data, max_pts, qid)

        # Fallback to expression
        return self._grade_expression(question, answer_data, max_pts, qid)

    def _grade_expression(self, question: Dict[str, Any], answer_data: Any, max_pts: Decimal, qid: str) -> QuestionGradeOutcome:
        expected = str(question.get("correct_answer_latex", "")).strip()
        user = str(answer_data).strip()
        if not expected or not user:
            return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False)

        if user == expected or user.lower() == expected.lower():
            return QuestionGradeOutcome(qid, max_pts, max_pts, "correct", True)

        tolerance = to_decimal(question.get("decimal_tolerance", "0.01"))
        if self._numeric_match(expected, user, tolerance):
            return QuestionGradeOutcome(qid, max_pts, max_pts, "correct", True, {"match": "numeric_tolerance"})

        if question.get("allow_simplification", True):
            if self._symbolic_match(expected, user):
                return QuestionGradeOutcome(qid, max_pts, max_pts, "correct", True, {"match": "symbolic_equality"})

        return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False)

    def _grade_number(self, question: Dict[str, Any], answer_data: Any, max_pts: Decimal, qid: str) -> QuestionGradeOutcome:
        expected = str(question.get("correct_answer_latex", "")).strip()
        user = str(answer_data).strip()
        
        tolerance = to_decimal(question.get("decimal_tolerance", "0.01"))
        if self._numeric_match(expected, user, tolerance):
            return QuestionGradeOutcome(qid, max_pts, max_pts, "correct", True)
            
        return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False)

    def _grade_choice(self, question: Dict[str, Any], answer_data: Any, max_pts: Decimal, qid: str) -> QuestionGradeOutcome:
        if not isinstance(answer_data, list):
            return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False)
            
        correct_ids = set(question.get("correct_answer_ids") or [])
        user_ids = set(answer_data)
        
        if correct_ids == user_ids:
            return QuestionGradeOutcome(qid, max_pts, max_pts, "correct", True)
            
        # Optional: partial credit if enabled in question
        if question.get("partial_credit") and correct_ids:
            correct_selected = len(user_ids.intersection(correct_ids))
            wrong_selected = len(user_ids - correct_ids)
            total_correct = len(correct_ids)
            
            score = (Decimal(correct_selected) - Decimal(wrong_selected)) / Decimal(total_correct) * max_pts
            score = max(Decimal("0"), score)
            
            return QuestionGradeOutcome(
                qid, score, max_pts, 
                "partial" if score > 0 else "incorrect",
                score > 0
            )

        return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False)

    def _grade_matrix(self, question: Dict[str, Any], answer_data: Any, max_pts: Decimal, qid: str) -> QuestionGradeOutcome:
        if not isinstance(answer_data, dict):
            return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False)
            
        exp_matrix = question.get("correct_answer_matrix")
        if not exp_matrix or not isinstance(exp_matrix, list):
            return QuestionGradeOutcome(qid, None, max_pts, CORRECTNESS_PENDING, None)
            
        user_rows = answer_data.get("rows")
        user_cols = answer_data.get("cols")
        user_data = answer_data.get("data")
        
        exp_rows = len(exp_matrix)
        exp_cols = len(exp_matrix[0]) if exp_rows > 0 else 0
        
        if user_rows != exp_rows or user_cols != exp_cols:
            return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False, {"error": "Shape mismatch"})
            
        tolerance = to_decimal(question.get("decimal_tolerance", "0.01"))
        
        all_match = True
        for r in range(exp_rows):
            for c in range(exp_cols):
                e_val = str(exp_matrix[r][c])
                u_val = str(user_data[r][c])
                if not self._numeric_match(e_val, u_val, tolerance):
                    all_match = False
                    break
            if not all_match:
                break
                
        if all_match:
            return QuestionGradeOutcome(qid, max_pts, max_pts, "correct", True)
            
        return QuestionGradeOutcome(qid, Decimal("0"), max_pts, "incorrect", False)

    @staticmethod
    def _numeric_match(expected: str, user: str, tolerance: Decimal) -> bool:
        try:
            exp_val = Decimal(str(expected).replace(",", "").replace("$", ""))
            user_val = Decimal(str(user).replace(",", "").replace("$", ""))
            return abs(exp_val - user_val) <= tolerance
        except (InvalidOperation, ValueError):
            return False

    def _symbolic_match(self, expected: str, user: str) -> bool:
        """Attempt to compare two expressions symbolically using Sympy."""
        e_norm = self._normalize_math(expected)
        u_norm = self._normalize_math(user)
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)
        try:
            expr_expected = parse_expr(e_norm, transformations=transformations)
            expr_user = parse_expr(u_norm, transformations=transformations)
            if self._compare_expressions(expr_expected, expr_user):
                return True
        except Exception:
            pass

        # Fallback for space-separated vectors: "6 -2" -> "6, -2"
        if " " in u_norm and "," not in u_norm and "(" not in u_norm and "[" not in u_norm:
            try:
                u_alt = re.sub(r"\s+", ",", u_norm)
                expr_user_alt = parse_expr(u_alt, transformations=transformations)
                if self._compare_expressions(expr_expected, expr_user_alt):
                    return True
            except Exception:
                pass

        return False

    def _compare_expressions(self, a: Any, b: Any) -> bool:
        """Deep comparison of Sympy expressions, including tuples/lists."""
        if isinstance(a, tuple) and isinstance(b, tuple):
            if len(a) != len(b):
                return False
            return all(self._compare_expressions(ai, bi) for ai, bi in zip(a, b))

        if isinstance(a, list) and isinstance(b, list):
            if len(a) != len(b):
                return False
            return all(self._compare_expressions(ai, bi) for ai, bi in zip(a, b))

        try:
            return simplify(a - b) == 0
        except Exception:
            return a == b

    @staticmethod
    def _normalize_math(s: str) -> str:
        if not s: return ""
        s = s.strip().replace(r"\left", "").replace(r"\right", "")
        s = s.replace(r"\cdot", "*").replace(r"\times", "*")
        for _ in range(3):
            s = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"((\1)/(\2))", s)
        for _ in range(3):
            s = re.sub(r"\\sqrt\{([^{}]*)\}", r"sqrt(\1)", s)
        funcs = ["sin", "cos", "tan", "exp", "log", "ln", "pi", "sqrt"]
        for f in funcs:
            s = s.replace("\\" + f, f)
        s = s.replace("{", "(").replace("}", ")").replace("\\", "")
        return s
