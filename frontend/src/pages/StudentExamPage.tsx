import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  startExam,
  getExamAttempt,
  saveExamAnswer,
  submitExamAttempt,
  logExamAudit,
  type ExamSessionPayload,
  type ExamQuestion,
} from "@/api/exams";
import LatexContent from "@/components/exam/LatexContent";
import {
  flattenExamQuestions,
  formatTimer,
  optionDisplayText,
  questionDisplayText,
  loadLocalAnswers,
  saveLocalAnswers,
  clearLocalAnswers,
} from "@/components/exam/examUtils";
import Loader from "@/components/ui/Loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, ChevronLeft, ChevronRight, Send, Maximize2, Minimize2 } from "lucide-react";
import { useT } from "@/i18n";

const C = {
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#b45309",
  accentBg: "#fffbeb",
};

export default function StudentExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const t = useT();
  const eid = Number(examId);

  const isAuthed =
    Boolean(localStorage.getItem("token")) && localStorage.getItem("role") === "student";

  const resumeAttemptId = searchParams.get("attempt");
  const [accessCode, setAccessCode] = useState("");
  const [session, setSession] = useState<ExamSessionPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    score?: number;
    max_score?: number;
    grading_status?: string;
    pending_manual_count?: number;
  } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMutation = useMutation({
    mutationFn: () => startExam(eid, accessCode || undefined),
    onSuccess: (data) => {
      examClosedRef.current = !!data.is_submitted;
      setSession(data);
      setTimeLeft(data.time_remaining_seconds);
      const merged = { ...(data.answers || {}), ...(loadLocalAnswers(data.attempt_id) || {}) };
      setAnswers(merged);
      setStartError(null);
      if (data.is_submitted) setSubmitted(true);
    },
    onError: (e: Error) => setStartError(e.message),
  });

  const resumeQuery = useQuery({
    queryKey: ["exam-attempt", resumeAttemptId],
    queryFn: () => getExamAttempt(Number(resumeAttemptId)),
    enabled: isAuthed && !!resumeAttemptId,
  });

  useEffect(() => {
    if (resumeQuery.data) {
      setSession(resumeQuery.data);
      setTimeLeft(resumeQuery.data.time_remaining_seconds);
      const merged = {
        ...(resumeQuery.data.answers || {}),
        ...(loadLocalAnswers(resumeQuery.data.attempt_id) || {}),
      };
      setAnswers(merged);
      if (resumeQuery.data.is_submitted) {
        examClosedRef.current = true;
        setSubmitted(true);
      }
    }
  }, [resumeQuery.data]);

  const questions = useMemo(
    () => (session ? flattenExamQuestions(session.exam.questions) : []),
    [session]
  );

  const currentQ = questions[currentIndex];

  const saveQueue = useRef<ReturnType<typeof setTimeout> | null>(null);
  const examClosedRef = useRef(false);
  const examRootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const persistAnswer = useCallback(
    async (qid: string, value: unknown) => {
      if (!session || submitted || examClosedRef.current || session.is_submitted) return;
      const res = await saveExamAnswer(session.attempt_id, qid, value);
      if (res.answers && typeof res.answers === "object") {
        setAnswers((prev) => {
          const merged = { ...prev, ...res.answers };
          saveLocalAnswers(session.attempt_id, merged);
          return merged;
        });
      }
    },
    [session, submitted]
  );

  const flushPendingSave = useCallback(() => {
    if (saveQueue.current) {
      clearTimeout(saveQueue.current);
      saveQueue.current = null;
    }
  }, []);

  const setAnswer = useCallback(
    (qid: string, value: unknown) => {
      setAnswers((prev) => {
        const next = { ...prev, [qid]: value };
        if (session) saveLocalAnswers(session.attempt_id, next);
        return next;
      });
      if (!session || submitted || examClosedRef.current || session.is_submitted) return;
      if (saveQueue.current) clearTimeout(saveQueue.current);
      saveQueue.current = setTimeout(() => {
        persistAnswer(qid, value ?? null).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "";
          if (msg.toLowerCase().includes("already submitted")) {
            examClosedRef.current = true;
            setSubmitted(true);
          }
        });
      }, 400);
    },
    [session, submitted, persistAnswer]
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      flushPendingSave();
      return submitExamAttempt(session!.attempt_id, answers);
    },
    onSuccess: (res) => {
      examClosedRef.current = true;
      flushPendingSave();
      if (session) clearLocalAnswers(session.attempt_id);
      setSubmitResult({
        score: res.score,
        max_score: res.max_score,
        grading_status: res.grading_status,
        pending_manual_count: res.pending_manual_count,
      });
      setSubmitted(true);
      setShowSubmit(false);
    },
  });

  useEffect(() => {
    if (!session || submitted) return;
    const tick = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tick);
          if (!submitMutation.isPending) submitMutation.mutate();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [session, submitted, submitMutation]);

  useEffect(() => {
    if (!session || submitted) return;
    autosaveTimer.current = setInterval(() => {
      const q = questions[currentIndex];
      if (q && answers[q.id] !== undefined) {
        persistAnswer(q.id, answers[q.id]);
      }
    }, 5000);
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    };
  }, [session, submitted, currentIndex, questions, answers, persistAnswer]);

  useEffect(() => {
    const onHide = () => {
      if (session && document.hidden) {
        logExamAudit(session.attempt_id, "tab_hidden").catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [session]);

  useEffect(() => {
    const syncFullscreen = () => {
      const el = examRootRef.current;
      setIsFullscreen(!!el && document.fullscreenElement === el);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      const el = examRootRef.current;
      if (el && document.fullscreenElement === el) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = examRootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
        await el.requestFullscreen();
      }
    } catch {
      /* browser blocked or unsupported */
    }
  }, []);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (session && !submitted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [session, submitted]);

  const answeredSet = useMemo(() => {
    const s = new Set<string>();
    Object.keys(answers).forEach((k) => {
      const v = answers[k];
      if (v !== undefined && v !== null && v !== "") {
        if (Array.isArray(v) && v.length === 0) return;
        s.add(k);
      }
    });
    return s;
  }, [answers]);

  if (!isAuthed) {
    return <Navigate to="/login?role=student" replace />;
  }

  if (!session && !resumeAttemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.bg }}>
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm" style={{ borderColor: C.border }}>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("student_exams.start_title")}</h1>
          <p className="text-slate-600 text-sm mb-6">{t("student_exams.start_intro")}</p>
          <input
            type="text"
            placeholder={t("student_exams.access_code_placeholder")}
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="w-full mb-4 px-3 py-2 border rounded-lg text-slate-900"
          />
          {startError && <p className="text-red-600 text-sm mb-3">{startError}</p>}
          <button
            type="button"
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate()}
            className="w-full py-3 rounded-lg font-semibold text-slate-900"
            style={{ background: "#FFD700" }}
          >
            {startMutation.isPending ? t("common.loading") : t("student_exams.begin")}
          </button>
          <button
            type="button"
            className="w-full mt-3 text-sm text-slate-500"
            onClick={() => navigate("/student/exams")}
          >
            {t("student_exams.back_to_list")}
          </button>
        </div>
      </div>
    );
  }

  if (resumeQuery.isLoading || startMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Loader />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.bg }}>
        <div
          className="max-w-md text-center bg-white rounded-2xl border p-10 shadow-sm"
          style={{ borderColor: C.border }}
        >
          <CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={48} />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("student_exams.submitted_title")}</h1>
          {submitResult?.score != null && submitResult.max_score != null && (
            <p className="text-3xl font-bold text-slate-900 mb-2">
              {submitResult.score} / {submitResult.max_score}
              {submitResult.max_score > 0 && (
                <span className="block text-lg font-semibold text-slate-600 mt-1">
                  {Math.round((submitResult.score / submitResult.max_score) * 100)}%
                </span>
              )}
            </p>
          )}
          {submitResult?.pending_manual_count != null && submitResult.pending_manual_count > 0 ? (
            <p className="text-amber-700 text-sm mb-4">
              Some answers need instructor review. Your score may update when grading is complete.
            </p>
          ) : (
            <p className="text-slate-600 mb-6">{t("student_exams.submitted_body")}</p>
          )}
          <button
            type="button"
            onClick={() => navigate("/student/exams")}
            className="px-6 py-2 rounded-lg font-semibold"
            style={{ background: "#FFD700", color: "#222" }}
          >
            {t("student_exams.back_to_list")}
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      ref={examRootRef}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: C.bg, color: C.text }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-white"
        style={{ borderColor: C.border }}
      >
        <div>
          <h1 className="font-bold text-lg text-slate-900">{session.exam.title}</h1>
          <p className="text-xs text-slate-500">Question {currentIndex + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-lg font-bold px-3 py-1 rounded-lg"
            style={{ background: C.accentBg, color: C.accent }}
          >
            {formatTimer(timeLeft)}
          </span>
          <button
            type="button"
            className="p-2 rounded-lg border"
            title={isFullscreen ? t("student_exams.fullscreen_exit") : t("student_exams.fullscreen_enter")}
            aria-pressed={isFullscreen}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-slate-900"
            style={{ background: "#FFD700" }}
          >
            <Send size={16} /> Submit
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className="w-full max-w-[220px] shrink-0 border-r bg-white overflow-y-auto p-3 hidden md:block"
          style={{ borderColor: C.border }}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Questions</p>
          <div className="grid grid-cols-4 gap-1.5">
            {questions.map((q, i) => {
              const done = answeredSet.has(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className="text-xs py-2 rounded-md border font-medium"
                  style={{
                    borderColor: i === currentIndex ? C.accent : C.border,
                    background: i === currentIndex ? C.accentBg : done ? "#ecfdf5" : "#fff",
                    color: i === currentIndex ? C.accent : done ? "#047857" : C.muted,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border p-6 md:p-8 shadow-sm" style={{ borderColor: C.border }}>
            {session.exam.instructions && currentIndex === 0 && (
              <div className="mb-6 p-4 rounded-lg text-sm" style={{ background: C.accentBg, color: C.muted }}>
                <LatexContent text={session.exam.instructions} />
              </div>
            )}
            {currentQ && <QuestionBlock question={currentQ} value={answers[currentQ.id]} onChange={(v) => setAnswer(currentQ.id, v)} />}
          </div>

          <div className="max-w-3xl mx-auto flex justify-between mt-4 gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border bg-white disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentQ) persistAnswer(currentQ.id, answers[currentQ.id] ?? null);
                  setCurrentIndex((i) => i + 1);
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: C.accent }}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmit(true)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-semibold text-slate-900"
                style={{ background: "#FFD700" }}
              >
                Finish <Send size={16} />
              </button>
            )}
          </div>
        </main>
      </div>

      <AlertDialog open={showSubmit} onOpenChange={setShowSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You answered {answeredSet.size} of {questions.length} questions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting…" : "Submit now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function QuestionBlock({
  question,
  value,
  onChange,
}: {
  question: ExamQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-start gap-4 mb-4">
        <LatexContent text={questionDisplayText(question)} className="text-slate-800" />
        <span className="text-xs font-semibold shrink-0 px-2 py-1 rounded-full" style={{ background: "#f1f5f9", color: "#64748b" }}>
          {question.points} pt
        </span>
      </div>

      {question.type === "single_choice" && question.options && (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label key={opt.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="mt-1"
              />
              <LatexContent text={optionDisplayText(opt)} />
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const selected = Array.isArray(value) ? (value as string[]).includes(opt.id) : false;
            return (
              <label key={opt.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const arr = Array.isArray(value) ? [...(value as string[])] : [];
                    if (selected) onChange(arr.filter((x) => x !== opt.id));
                    else onChange([...arr, opt.id]);
                  }}
                  className="mt-1"
                />
                <LatexContent text={optionDisplayText(opt)} />
              </label>
            );
          })}
        </div>
      )}

      {question.type === "true_false" && (
        <div className="flex gap-3">
          {[
            { label: "True", v: true },
            { label: "False", v: false },
          ].map((opt) => (
            <button
              key={String(opt.v)}
              type="button"
              onClick={() => onChange(opt.v)}
              className="flex-1 py-3 rounded-lg border font-medium"
              style={{
                borderColor: value === opt.v ? "#b45309" : "#e2e8f0",
                background: value === opt.v ? "#fffbeb" : "#fff",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {(question.type === "essay" || question.type === "short_answer" || question.type === "mathematical") && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={question.type === "essay" ? 8 : 4}
          placeholder={question.type === "mathematical" ? "Enter answer (LaTeX supported, e.g. $x^2+1$)" : "Your answer"}
          className="w-full border rounded-lg p-3 text-slate-900 font-mono text-sm"
        />
      )}

      {question.type === "code" && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="w-full border rounded-lg p-3 bg-slate-900 text-green-400 font-mono text-sm"
          spellCheck={false}
        />
      )}
    </div>
  );
}
