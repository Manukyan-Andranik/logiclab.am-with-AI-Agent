import { useQuery } from "@tanstack/react-query";
import { getExamGradingAnalytics, type ExamGradingAnalytics } from "@/api/exams";
import Loader from "@/components/ui/Loader";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  examId: number;
  examTitle?: string;
};

const DIST_ORDER = ["0-49", "50-69", "70-89", "90-100"] as const;

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function ScoreDistribution({ data }: { data: Record<string, number> }) {
  const max = Math.max(1, ...DIST_ORDER.map((k) => data[k] ?? 0));
  return (
    <div className="space-y-3">
      {DIST_ORDER.map((bucket) => {
        const count = data[bucket] ?? 0;
        const pct = (count / max) * 100;
        return (
          <div key={bucket} className="flex items-center gap-3 text-sm">
            <span className="w-14 shrink-0 text-muted-foreground font-mono text-xs">{bucket}%</span>
            <div className="flex-1 h-6 rounded-md bg-secondary/60 overflow-hidden">
              <div
                className="h-full rounded-md bg-primary transition-all"
                style={{ width: `${pct}%`, minWidth: count > 0 ? "4px" : 0 }}
              />
            </div>
            <span className="w-8 text-right font-medium">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function QuestionTable({
  rows,
  title,
}: {
  rows: ExamGradingAnalytics["question_analytics"];
  title: string;
}) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No per-question data yet (students need submitted attempts with answers).
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="border rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Avg %</TableHead>
              <TableHead className="text-right">Missed %</TableHead>
              <TableHead className="text-right">Difficulty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((q) => (
              <TableRow key={q.question_id}>
                <TableCell className="text-xs align-top">
                  <span className="line-clamp-2" title={q.question_text || q.question_id}>
                    {q.question_text || q.question_id}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    {q.question_id}
                    {q.points != null ? ` · ${q.points} pt` : ""}
                  </span>
                </TableCell>
                <TableCell>
                  {q.type ? (
                    <Badge variant="outline" className="text-[10px]">
                      {q.type}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">{q.average_percent}%</TableCell>
                <TableCell className="text-right text-amber-600">{q.missed_rate}%</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={q.difficulty_index >= 60 ? "destructive" : q.difficulty_index >= 35 ? "secondary" : "outline"}
                  >
                    {q.difficulty_index}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ExamAnalyticsPanel({ examId, examTitle }: Props) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["exam-analytics", examId],
    queryFn: () => getExamGradingAnalytics(examId),
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
        {(error as Error)?.message ?? "Could not load analytics."}
      </p>
    );
  }

  if ("error" in data && (data as { error?: string }).error) {
    return <p className="text-destructive text-sm">{(data as { error: string }).error}</p>;
  }

  const analytics = data as ExamGradingAnalytics;
  const title = examTitle || analytics.exam_title || `Exam #${examId}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Grading analytics · pass threshold {analytics.pass_threshold}%
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {analytics.total_attempts === 0 ? (
        <p className="text-muted-foreground text-center py-8 border rounded-lg">
          No submitted attempts yet. Analytics appear after students submit exams.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Attempts" value={String(analytics.total_attempts)} />
            <StatCard
              label="Average score"
              value={analytics.average_score_percent != null ? `${analytics.average_score_percent}%` : "—"}
            />
            <StatCard
              label="Median score"
              value={analytics.median_score_percent != null ? `${analytics.median_score_percent}%` : "—"}
            />
            <StatCard
              label="Pass rate"
              value={analytics.pass_rate_percent != null ? `${analytics.pass_rate_percent}%` : "—"}
              hint={`≥ ${analytics.pass_threshold}%`}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold mb-4">Score distribution</h3>
              <ScoreDistribution data={analytics.score_distribution} />
            </div>
            <div className="rounded-lg border border-border p-4">
              <QuestionTable
                rows={analytics.most_missed_questions}
                title="Hardest questions (top missed)"
              />
            </div>
          </div>

          <QuestionTable rows={analytics.question_analytics} title="All questions" />
        </>
      )}
    </div>
  );
}
