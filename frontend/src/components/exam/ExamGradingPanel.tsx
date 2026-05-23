import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAttemptGrading,
  saveAttemptGrading,
  regradeAttemptAuto,
  type ExamGradingDetail,
  type ExamGradingQuestion,
} from "@/api/exams";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { useToast } from "@/hooks/use-toast";
import LatexContent from "@/components/exam/LatexContent";
import { RefreshCw } from "lucide-react";

type Props = {
  attemptId: number;
  examId: number;
  onClose: () => void;
};

function gradingBadge(status: string, pending: number) {
  if (status === "pending_manual" || pending > 0) {
    return <Badge variant="secondary">Needs review ({pending})</Badge>;
  }
  if (status === "complete") {
    return <Badge>Graded</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

export default function ExamGradingPanel({ attemptId, examId, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draftPoints, setDraftPoints] = useState<Record<string, string>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["exam-grading", attemptId],
    queryFn: () => getAttemptGrading(attemptId),
  });

  useEffect(() => {
    if (!data?.questions) return;
    const initial: Record<string, string> = {};
    for (const q of data.questions) {
      initial[q.question_id] =
        q.points_awarded != null ? String(q.points_awarded) : "";
    }
    setDraftPoints(initial);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const grades = (data?.questions ?? []).map((q) => ({
        question_id: q.question_id,
        points_awarded: Number(draftPoints[q.question_id] ?? 0),
      }));
      return saveAttemptGrading(attemptId, grades);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["exam-submissions", examId] });
      queryClient.invalidateQueries({ queryKey: ["exam-grading", attemptId] });
      toast({
        title: "Grades saved",
        description: `Score: ${res.score} / ${res.max_score}`,
      });
      refetch();
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const regradeMutation = useMutation({
    mutationFn: () => regradeAttemptAuto(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-submissions", examId] });
      refetch();
      toast({ title: "Auto-grade applied", description: "Objective questions re-scored." });
    },
    onError: (e: Error) =>
      toast({ title: "Regrade failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-destructive text-sm py-4">
        {(error as Error)?.message ?? "Could not load grading data."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-lg">{data.student_name}</p>
          <p className="text-sm text-muted-foreground">{data.student_email}</p>
          <p className="text-sm mt-1">
            Score:{" "}
            <strong>
              {data.score ?? 0} / {data.max_score ?? 0}
            </strong>
            {data.score_percent != null && (
              <span className="text-muted-foreground ml-2">
                ({data.score_percent}% of exam)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {gradingBadge(data.grading_status, data.pending_manual_count)}
          {data.integrity_score != null && (
            <Badge variant={data.integrity_score < 70 ? "destructive" : "outline"}>
              Integrity {data.integrity_score}%
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={regradeMutation.isPending}
            onClick={() => regradeMutation.mutate()}
          >
            <RefreshCw size={14} />
            Re-run auto-grade
          </Button>
        </div>
      </div>

      <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">
        {data.questions.map((q) => (
          <QuestionGradeRow
            key={q.question_id}
            question={q}
            value={draftPoints[q.question_id] ?? ""}
            onChange={(v) =>
              setDraftPoints((prev) => ({ ...prev, [q.question_id]: v }))
            }
          />
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader /> : "Save grades"}
        </Button>
      </div>
    </div>
  );
}

function formatCorrectAnswer(keys: Record<string, unknown>): ReactNode {
  if (keys.correct_answer != null && typeof keys.correct_answer === "string") {
    return <p>{keys.correct_answer}</p>;
  }
  if (keys.correct_answers != null) {
    const val = keys.correct_answers;
    return <p>{Array.isArray(val) ? val.join("; ") : String(val)}</p>;
  }
  if (Array.isArray(keys.correct_matches)) {
    return keys.correct_matches.map((line, i) => (
      <p key={i}>{String(line)}</p>
    ));
  }
  if (keys.correct_matches != null) {
    return <p>{JSON.stringify(keys.correct_matches)}</p>;
  }
  if (Array.isArray(keys.blanks)) {
    return keys.blanks.map((b, i) => (
      <p key={i}>
        {typeof b === "object" && b !== null
          ? Object.entries(b as Record<string, string>)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" — ")
          : String(b)}
      </p>
    ));
  }
  if (keys.note != null) {
    return <p className="text-muted-foreground">{String(keys.note)}</p>;
  }
  return (
    <pre className="overflow-x-auto">{JSON.stringify(keys, null, 2)}</pre>
  );
}

function QuestionGradeRow({
  question: q,
  value,
  onChange,
}: {
  question: ExamGradingQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              {q.type}
            </Badge>
            {q.auto_gradable ? (
              <span className="text-[10px] text-muted-foreground">Auto-graded</span>
            ) : (
              <span className="text-[10px] text-amber-600 font-medium">Manual</span>
            )}
          </div>
          <LatexContent text={q.question_text} className="text-sm text-foreground" />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">Max {q.max_points} pt</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-secondary/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Student answer</p>
          <p className="whitespace-pre-wrap">{q.student_answer_display || "—"}</p>
        </div>
        {q.answer_keys && Object.keys(q.answer_keys).length > 0 && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <p className="text-xs font-semibold mb-1 text-black">Correct answer</p>
            <div className="text-xs whitespace-pre-wrap text-black space-y-1">
              {formatCorrectAnswer(q.answer_keys)}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`pts-${q.question_id}`}>Points awarded</Label>
          <Input
            id={`pts-${q.question_id}`}
            type="number"
            min={0}
            max={q.max_points}
            step={0.5}
            className="w-28"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        {q.correctness === "correct" && <Badge className="bg-emerald-600">Correct</Badge>}
        {q.correctness === "partial" && <Badge variant="secondary">Partial credit</Badge>}
        {q.correctness === "incorrect" && q.points_awarded != null && (
          <Badge variant="secondary">Incorrect</Badge>
        )}
        {(q.correctness === "pending_review" || (q.points_awarded == null && !q.auto_gradable)) && (
          <Badge variant="outline">Awaiting grade</Badge>
        )}
        {q.feedback && (
          <p className="text-xs text-muted-foreground w-full">Feedback: {q.feedback}</p>
        )}
      </div>
    </div>
  );
}
