import { apiClient } from "./client";

export type ExamAvailability = "waiting" | "available" | "unavailable";

/** Student progress on an exam (dashboard label). */
export type StudentExamDisplayStatus = "not_available" | "unfinished" | "submitted";

export interface AdminExam {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  instructions?: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  max_attempts: number;
  is_final: boolean;
  pass_score_percentage: number;
  total_points: number;
  question_count: number;
  allow_navigation: boolean;
  allow_review: boolean;
  access_token?: string | null;
  allowed_student_ids: number[];
  created_at?: string;
  questions?: Record<string, unknown>;
}

export interface StudentExamListItem {
  id: number;
  course_id: number;
  exam_status: string;
  student_status: StudentExamDisplayStatus;
  title: string;
  description?: string;
  duration_minutes: number;
  total_points: number;
  start_time: string | null;
  end_time: string | null;
  availability: ExamAvailability;
  message: string;
  requires_token: boolean;
  can_attempt: boolean;
  attempts_used: number;
  attempts_remaining: number;
  active_attempt_id?: number | null;
  last_score?: number | null;
  last_max_score?: number | null;
  submitted_at?: string | null;
}

export interface ExamQuestion {
  id: string;
  type: string;
  question_text: string;
  question_latex?: string;
  difficulty?: string;
  points: number;
  required?: boolean;
  options?: { id: string; text: string; latex?: string }[];
  min_words?: number;
  max_words?: number;
  images?: string[];
  code_block?: string;
}

export interface ExamSessionPayload {
  attempt_id: number;
  attempt_status?: string;
  is_submitted?: boolean;
  started_at: string;
  time_remaining_seconds: number;
  answers: Record<string, unknown>;
  exam: {
    id: number;
    title: string;
    instructions?: string;
    duration_minutes: number;
    questions: Record<string, unknown>;
    settings: {
      allow_navigation: boolean;
      allow_review: boolean;
      randomize_questions: boolean;
      randomize_options: boolean;
    };
  };
}

export type GradingStatus = "complete" | "pending_manual" | "ungraded";

export interface ExamSubmissionRow {
  id: number;
  attempt_id: number;
  student_id: number;
  student_name: string;
  student_email?: string;
  score?: number;
  max_score?: number;
  grading_status?: GradingStatus;
  pending_manual_count?: number;
  attempt_status?: string;
  submitted_at: string;
  time_spent_seconds: number;
  email_sent: boolean;
  download_path?: string;
}

export type QuestionCorrectness = "correct" | "incorrect" | "partial" | "pending_review";

export interface ExamGradingQuestion {
  question_id: string;
  type: string;
  question_text: string;
  question_latex?: string;
  points: number;
  options?: { id: string; text: string; latex?: string }[];
  auto_gradable: boolean;
  answer_keys?: Record<string, unknown>;
  student_answer: unknown;
  student_answer_display: string;
  points_awarded: number | null;
  earned_points?: number | null;
  max_points: number;
  is_correct: boolean | null;
  correctness?: QuestionCorrectness | null;
  feedback?: string | null;
  rubric_result?: Record<string, number> | null;
}

export interface ExamGradingDetail {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  student_email?: string;
  submitted_at: string | null;
  time_spent_seconds: number;
  score: number;
  max_score: number;
  score_percent?: number | null;
  grading_status: GradingStatus;
  pending_manual_count: number;
  answered_count?: number;
  attempt_status: string;
  grading_version?: number;
  integrity_score?: number | null;
  questions: ExamGradingQuestion[];
}

export interface StudentExamResult {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  score: number;
  max_score: number;
  score_percent?: number | null;
  earned_points?: number;
  max_points?: number;
  grading_status: GradingStatus;
  pending_manual_count: number;
  attempt_status: string;
  submitted_at: string | null;
  integrity_score?: number | null;
  questions: {
    question_id: string;
    type: string;
    question_text: string;
    points: number;
    points_awarded: number | null;
    earned_points?: number | null;
    max_points: number;
    is_correct: boolean | null;
    correctness?: QuestionCorrectness | null;
    feedback?: string | null;
    pending_review: boolean;
  }[];
}

export interface ExamQuestionAnalytics {
  question_id: string;
  question_text?: string;
  type?: string;
  points?: number;
  average_percent: number;
  difficulty_index: number;
  missed_rate: number;
  attempts: number;
}

export interface ExamGradingAnalytics {
  exam_id: number;
  exam_title?: string;
  total_attempts: number;
  average_score_percent: number | null;
  median_score_percent: number | null;
  pass_rate_percent: number | null;
  pass_threshold: number;
  most_missed_questions: ExamQuestionAnalytics[];
  question_analytics: ExamQuestionAnalytics[];
  score_distribution: Record<string, number>;
}

export interface IntegrityReport {
  attempt_id: number;
  integrity_score: number;
  flags: { type: string; severity: string; message?: string; count?: number }[];
}

export const listAdminExams = (courseId?: number) =>
  apiClient<{ data: AdminExam[]; total: number }>("/exams/admin/list", {
    params: courseId != null ? { course_id: courseId } : {},
  });

export const getAdminExam = (examId: number) =>
  apiClient<AdminExam>(`/exams/admin/${examId}`);

export const uploadExamJson = (courseId: number, file: File) => {
  const form = new FormData();
  form.append("course_id", String(courseId));
  form.append("file", file);
  return apiClient<AdminExam>("/exams/admin/upload", { method: "POST", body: form });
};

export const updateExamMetadata = (examId: number, data: Record<string, unknown>) =>
  apiClient<AdminExam>(`/exams/admin/${examId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

/** Restrict exam to specific students. Pass [] to allow all students in the course. */
export const updateExamStudentAccess = (examId: number, allowedStudentIds: number[]) =>
  updateExamMetadata(examId, { allowed_student_ids: allowedStudentIds });

export const activateExam = (examId: number) =>
  apiClient<{ success: boolean }>(`/exams/admin/${examId}/activate`, { method: "PATCH" });

export const deactivateExam = (examId: number) =>
  apiClient<{ success: boolean }>(`/exams/admin/${examId}/deactivate`, { method: "PATCH" });

export const deleteExam = (examId: number) =>
  apiClient<void>(`/exams/admin/${examId}`, { method: "DELETE" });

export const listExamSubmissions = (examId: number) =>
  apiClient<{ data: ExamSubmissionRow[]; total: number }>(`/exams/admin/${examId}/submissions`);

export const getActiveExamStudents = (examId: number) =>
  apiClient<{ count: number; students: { attempt_id: number; student_id: number; name: string; started_at: string; elapsed_seconds: number }[] }>(
    `/exams/admin/${examId}/active-students`
  );

export const downloadSubmissionUrl = (submissionId: number) => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  return `${base}/exams/admin/submissions/${submissionId}/download`;
};

export const getAttemptGrading = (attemptId: number) =>
  apiClient<ExamGradingDetail>(`/exams/admin/attempts/${attemptId}/grading`);

export const getExamGradingAnalytics = (examId: number) =>
  apiClient<ExamGradingAnalytics>(`/exams/admin/${examId}/grading-analytics`);

export const getAttemptIntegrity = (attemptId: number) =>
  apiClient<IntegrityReport>(`/exams/admin/attempts/${attemptId}/integrity`);

export const saveAttemptGrading = (
  attemptId: number,
  grades: {
    question_id: string;
    points_awarded?: number;
    feedback?: string;
    rubric_scores?: Record<string, number>;
  }[]
) =>
  apiClient<{
    success: boolean;
    score: number;
    max_score: number;
    grading_status: GradingStatus;
    pending_manual_count: number;
  }>(`/exams/admin/attempts/${attemptId}/grading`, {
    method: "PUT",
    body: JSON.stringify({ grades }),
  });

export const regradeAttemptAuto = (attemptId: number) =>
  apiClient<{
    success: boolean;
    score: number;
    max_score: number;
    grading_status: GradingStatus;
  }>(`/exams/admin/attempts/${attemptId}/regrade`, { method: "POST" });

export const getStudentAttemptResult = (attemptId: number) =>
  apiClient<StudentExamResult>(`/exams/student/attempts/${attemptId}/result`);

export const listStudentExams = (courseId?: number) =>
  apiClient<StudentExamListItem[]>("/exams/student/available", {
    params: courseId != null ? { course_id: courseId } : {},
  });

export const startExam = (examId: number, accessToken?: string) =>
  apiClient<ExamSessionPayload>(`/exams/student/start/${examId}`, {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken || null }),
  });

export const getExamAttempt = (attemptId: number) =>
  apiClient<ExamSessionPayload>(`/exams/student/attempts/${attemptId}`);

export const saveExamAnswer = (attemptId: number, questionId: string, answerValue: unknown) =>
  apiClient<{ success: boolean; answers?: Record<string, unknown> }>(`/exams/student/attempts/${attemptId}/save-answer`, {
    method: "POST",
    body: JSON.stringify({
      question_id: questionId,
      // JSON.stringify drops undefined — send null so the API always gets answer_value
      answer_value: answerValue === undefined ? null : answerValue,
    }),
  });

export const submitExamAttempt = (attemptId: number, answers?: Record<string, unknown>) =>
  apiClient<{
    success: boolean;
    submission_id: number;
    time_spent_seconds: number;
    score?: number;
    max_score?: number;
    grading_status?: GradingStatus;
    pending_manual_count?: number;
    attempt_status?: string;
  }>(
    `/exams/student/attempts/${attemptId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({ answers: answers ?? {} }),
    }
  );

export const logExamAudit = (attemptId: number, action: string, details?: Record<string, unknown>) =>
  apiClient<{ logged: boolean }>(`/exams/student/attempts/${attemptId}/audit`, {
    method: "POST",
    body: JSON.stringify({ action, details }),
  });
