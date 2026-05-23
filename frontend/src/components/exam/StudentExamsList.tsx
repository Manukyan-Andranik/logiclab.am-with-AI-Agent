import { Link } from "react-router-dom";
import { Clock, FileText, Play, Lock, ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";
import type { StudentExamListItem, StudentExamDisplayStatus } from "@/api/exams";
import { useT } from "@/i18n";

function useStatusMeta() {
  const t = useT();
  return {
    unfinished: {
      label: t("student_exams.status_unfinished"),
      className: "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent-strong))]",
    },
    submitted: {
      label: t("student_exams.status_submitted"),
      className: "bg-blue-500/15 text-blue-400",
    },
    not_available: {
      label: t("student_exams.status_not_available"),
      className: "bg-secondary text-muted-foreground",
    },
  } satisfies Record<StudentExamDisplayStatus, { label: string; className: string }>;
}

function useActionHint() {
  const t = useT();
  return (exam: StudentExamListItem): string => {
    if (exam.student_status === "unfinished") return t("student_exams.action_resume");
    if (exam.student_status === "submitted") {
      if (exam.attempts_remaining > 0 && exam.availability === "available") {
        return t("student_exams.action_take_again");
      }
      return t("student_exams.action_submitted");
    }
    if (exam.can_attempt && exam.availability === "available") return t("student_exams.action_start");
    if (exam.exam_status === "draft" || exam.exam_status === "inactive") {
      return t("student_exams.action_not_started");
    }
    if (exam.availability === "waiting") return t("student_exams.action_not_open");
    if (exam.attempts_remaining === 0) return t("student_exams.action_no_attempts");
    return t("student_exams.action_unavailable");
  };
}

function ExamRow({ exam, compact }: { exam: StudentExamListItem; compact?: boolean }) {
  const t = useT();
  const statusMeta = useStatusMeta();
  const actionHint = useActionHint();
  const badge = statusMeta[exam.student_status] ?? statusMeta.not_available;
  const canStart =
    exam.student_status === "unfinished" ||
    (exam.can_attempt && exam.availability === "available");

  const showRetake =
    exam.student_status === "submitted" &&
    exam.attempts_remaining > 0 &&
    exam.availability === "available";

  const actionLabel =
    exam.student_status === "unfinished"
      ? t("student_exams.action_resume")
      : showRetake
        ? t("student_exams.action_take_again")
        : t("student_exams.action_start");

  return (
    <div
      className={`flex flex-wrap gap-3 items-center justify-between rounded-xl border border-border bg-[hsl(var(--surface-2))] ${
        compact ? "p-3.5" : "p-5"
      }`}
    >
      <div className="flex-1 min-w-[180px]">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <FileText size={16} className="text-[hsl(var(--accent-strong))]" />
          <span className={`font-semibold ${compact ? "text-[0.95rem]" : "text-lg"}`}>{exam.title}</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {!compact && exam.description && (
          <p className="text-muted-foreground text-sm mb-1.5">{exam.description}</p>
        )}
        <div className="flex flex-wrap gap-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {exam.duration_minutes} min
          </span>
          <span>{exam.total_points} pts</span>
          {exam.student_status === "submitted" && exam.last_score != null && exam.last_max_score != null && (
            <span className="text-blue-400">
              Score: {exam.last_score} / {exam.last_max_score}
              {exam.last_max_score > 0 && (
                <> ({Math.round((exam.last_score / exam.last_max_score) * 100)}%)</>
              )}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{exam.message}</p>
      </div>

      <div>
        {canStart || showRetake ? (
          <Link
            to={
              exam.active_attempt_id
                ? `/student/exam/${exam.id}?attempt=${exam.active_attempt_id}`
                : `/student/exam/${exam.id}`
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[hsl(var(--accent-strong))] text-[hsl(var(--surface-1))] font-bold text-sm no-underline"
          >
            <Play size={14} />
            {actionLabel}
          </Link>
        ) : exam.student_status === "submitted" ? (
          <span className="inline-flex items-center gap-1.5 text-blue-400 text-sm font-semibold">
            <CheckCircle2 size={14} /> {t("student_exams.action_submitted")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
            <Lock size={14} /> {actionHint(exam)}
          </span>
        )}
      </div>
    </div>
  );
}

const SECTION_ORDER: StudentExamDisplayStatus[] = ["unfinished", "submitted", "not_available"];

type Props = {
  exams: StudentExamListItem[];
  compact?: boolean;
  showSections?: boolean;
};

export default function StudentExamsList({ exams, compact, showSections }: Props) {
  const t = useT();
  const statusMeta = useStatusMeta();

  const sectionTitle: Record<StudentExamDisplayStatus, string> = {
    unfinished: t("student_exams.status_unfinished"),
    submitted: t("student_exams.status_submitted"),
    not_available: t("student_exams.status_not_available"),
  };

  const byStatus = (status: StudentExamDisplayStatus) =>
    exams.filter((e) => e.student_status === status);

  if (!showSections) {
    return (
      <div className="flex flex-col gap-2.5">
        {exams.map((exam) => (
          <ExamRow key={exam.id} exam={exam} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {SECTION_ORDER.map((status) => {
        const group = byStatus(status);
        if (!group.length) return null;
        const meta = statusMeta[status];
        return (
          <div key={status}>
            <h3
              className={`text-xs font-semibold uppercase mb-2 flex items-center gap-1.5 ${meta.className.split(" ").find((c) => c.startsWith("text-")) ?? "text-muted-foreground"}`}
            >
              {status === "unfinished" && <AlertCircle size={14} />}
              {status === "submitted" && <CheckCircle2 size={14} />}
              {status === "not_available" && <Lock size={14} />}
              {sectionTitle[status]} ({group.length})
            </h3>
            <div className="flex flex-col gap-2.5">
              {group.map((exam) => (
                <ExamRow key={exam.id} exam={exam} compact={compact} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StudentExamsDashboardCard({
  exams,
  isLoading,
}: {
  exams: StudentExamListItem[] | undefined;
  isLoading: boolean;
}) {
  const t = useT();
  const statusMeta = useStatusMeta();
  const list = exams ?? [];
  const unfinished = list.filter((e) => e.student_status === "unfinished").length;
  const submitted = list.filter((e) => e.student_status === "submitted").length;
  const notAvailable = list.filter((e) => e.student_status === "not_available").length;

  return (
    <div className="rounded-[1.25rem] border border-border bg-[hsl(var(--surface-2))] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-[hsl(var(--accent-strong))]" />
          <h2 className="text-base font-bold m-0 text-[hsl(var(--text-primary))]">
            {t("student_exams.dashboard_card_title")}
          </h2>
        </div>
        <Link
          to="/student/exams"
          className="text-[hsl(var(--accent-strong))] text-sm font-semibold no-underline"
        >
          {t("student_exams.dashboard_card_cta")}
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">{t("common.loading")}</p>}

      {!isLoading && list.length === 0 && (
        <p className="text-muted-foreground text-sm m-0">{t("student_exams.empty")}</p>
      )}

      {!isLoading && list.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            {unfinished > 0 && (
              <span className={`px-2.5 py-1 rounded-full font-semibold ${statusMeta.unfinished.className}`}>
                {unfinished} {t("student_exams.status_unfinished").toLowerCase()}
              </span>
            )}
            {submitted > 0 && (
              <span className={`px-2.5 py-1 rounded-full font-semibold ${statusMeta.submitted.className}`}>
                {submitted} {t("student_exams.status_submitted").toLowerCase()}
              </span>
            )}
            {notAvailable > 0 && (
              <span className={`px-2.5 py-1 rounded-full font-semibold ${statusMeta.not_available.className}`}>
                {notAvailable} {t("student_exams.status_not_available").toLowerCase()}
              </span>
            )}
          </div>
          <StudentExamsList exams={list.slice(0, 5)} compact showSections />
        </>
      )}
    </div>
  );
}
