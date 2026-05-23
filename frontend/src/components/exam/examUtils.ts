import type { ExamQuestion } from "@/api/exams";
import { ensureLatexDelimiters } from "./latexUtils";

export function flattenExamQuestions(questionsRoot: Record<string, unknown>): ExamQuestion[] {
  const out: ExamQuestion[] = [];
  const root = questionsRoot || {};
  const push = (q: unknown) => {
    if (q && typeof q === "object" && "id" in q) {
      out.push(q as ExamQuestion);
    }
  };
  for (const q of (root.questions as unknown[]) || []) push(q);
  for (const section of (root.sections as { questions?: unknown[] }[]) || []) {
    for (const q of section?.questions || []) push(q);
  }
  return out;
}

export function storageKey(attemptId: number) {
  return `logiclab_exam_attempt_${attemptId}`;
}

export function loadLocalAnswers(attemptId: number): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(storageKey(attemptId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalAnswers(attemptId: number, answers: Record<string, unknown>) {
  localStorage.setItem(storageKey(attemptId), JSON.stringify(answers));
}

export function clearLocalAnswers(attemptId: number) {
  localStorage.removeItem(storageKey(attemptId));
}

/** Build question body for LatexContent (avoids duplicating undelimited question_latex). */
export function questionDisplayText(question: ExamQuestion): string {
  const parts: string[] = [];
  if (question.question_text?.trim()) parts.push(question.question_text.trim());
  if (question.question_latex?.trim()) {
    parts.push(ensureLatexDelimiters(question.question_latex.trim()));
  }
  return parts.join("\n\n");
}

export function optionDisplayText(option: { text: string; latex?: string | null }): string {
  if (option.latex?.trim()) return ensureLatexDelimiters(option.latex.trim());
  return option.text ?? "";
}

export function formatTimer(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
