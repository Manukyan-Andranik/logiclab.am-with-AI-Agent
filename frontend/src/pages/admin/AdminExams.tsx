import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCourses } from "@/api/courses";
import { getAdminStudentsForCourse, type AdminStudentWithProgress } from "@/api/admin";
import {
  listAdminExams,
  uploadExamJson,
  activateExam,
  deactivateExam,
  deleteExam,
  listExamSubmissions,
  getActiveExamStudents,
  downloadSubmissionUrl,
  updateExamStudentAccess,
  updateExamMetadata,
  type AdminExam,
  type ExamSubmissionRow,
} from "@/api/exams";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Loader from "@/components/ui/Loader";
import { Upload, Play, Pause, Trash2, Users, Download, FileJson, UserCheck, ClipboardCheck, Settings, BarChart3 } from "lucide-react";
import ExamGradingPanel from "@/components/exam/ExamGradingPanel";
import ExamAnalyticsPanel from "@/components/exam/ExamAnalyticsPanel";
import { Checkbox } from "@/components/ui/checkbox";

function studentDisplayName(s: AdminStudentWithProgress): string {
  const u = s.user;
  if (u?.first_name || u?.last_name) {
    return [u.first_name, u.last_name].filter(Boolean).join(" ");
  }
  return u?.email ?? `Student #${s.id}`;
}

const DURATION_OPTIONS = [15, 30, 60, 90, 120, 180];

function formatWindow(exam: AdminExam): string {
  if (exam.status !== "active" || !exam.end_time) {
    return "Starts when you click Start";
  }
  return `Ends ${new Date(exam.end_time).toLocaleString()}`;
}

function accessLabel(exam: AdminExam): string {
  const ids = exam.allowed_student_ids ?? [];
  if (!ids.length) return "All in course";
  return `${ids.length} selected`;
}

const AdminExams = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [courseId, setCourseId] = useState<number | "">("");
  const [submissionsExamId, setSubmissionsExamId] = useState<number | null>(null);
  const [gradingAttemptId, setGradingAttemptId] = useState<number | null>(null);
  const [analyticsExam, setAnalyticsExam] = useState<AdminExam | null>(null);
  const [monitorExamId, setMonitorExamId] = useState<number | null>(null);
  const [accessExam, setAccessExam] = useState<AdminExam | null>(null);
  const [editExam, setEditExam] = useState<AdminExam | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    instructions: "",
    duration_minutes: 60,
    max_attempts: 1,
    is_final: false,
    pass_score_percentage: 70,
  });
  const [restrictAccess, setRestrictAccess] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["courses-all"],
    queryFn: () => getCourses(),
  });

  const cid = courseId === "" ? undefined : Number(courseId);

  const { data: examsData, isLoading } = useQuery({
    queryKey: ["admin-exams", cid],
    queryFn: () => listAdminExams(cid),
    enabled: cid !== undefined,
  });

  const { data: submissions } = useQuery({
    queryKey: ["exam-submissions", submissionsExamId],
    queryFn: () => listExamSubmissions(submissionsExamId!),
    enabled: submissionsExamId != null,
  });

  const { data: activeStudents } = useQuery({
    queryKey: ["exam-active", monitorExamId],
    queryFn: () => getActiveExamStudents(monitorExamId!),
    enabled: monitorExamId != null,
    refetchInterval: monitorExamId != null ? 8000 : false,
  });

  const accessCourseId = accessExam?.course_id;

  const { data: courseStudents, isLoading: courseStudentsLoading } = useQuery({
    queryKey: ["admin-students-course", accessCourseId],
    queryFn: () => getAdminStudentsForCourse(accessCourseId!),
    enabled: accessCourseId != null,
  });

  useEffect(() => {
    if (!accessExam) return;
    const ids = accessExam.allowed_student_ids ?? [];
    setRestrictAccess(ids.length > 0);
    setSelectedStudentIds(ids);
    setStudentSearch("");
  }, [accessExam]);

  const accessMutation = useMutation({
    mutationFn: ({ examId, ids }: { examId: number; ids: number[] }) =>
      updateExamStudentAccess(examId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      toast({ title: "Access updated", description: "Student access list saved." });
      setAccessExam(null);
    },
    onError: (e: Error) =>
      toast({ title: "Could not save access", description: e.message, variant: "destructive" }),
  });

  const filteredCourseStudents = (courseStudents ?? []).filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    const name = studentDisplayName(s).toLowerCase();
    const email = (s.user?.email ?? "").toLowerCase();
    return name.includes(q) || email.includes(q) || String(s.id).includes(q);
  });

  const openAccessDialog = (exam: AdminExam) => setAccessExam(exam);

  const toggleStudent = (studentId: number, checked: boolean) => {
    setSelectedStudentIds((prev) =>
      checked ? [...new Set([...prev, studentId])] : prev.filter((id) => id !== studentId)
    );
  };

  const saveAccess = () => {
    if (!accessExam) return;
    if (restrictAccess && selectedStudentIds.length === 0) {
      toast({
        title: "Select at least one student",
        description: "Or switch to “All students in course”.",
        variant: "destructive",
      });
      return;
    }
    accessMutation.mutate({
      examId: accessExam.id,
      ids: restrictAccess ? selectedStudentIds : [],
    });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadExamJson(Number(courseId), file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      toast({ title: "Exam uploaded", description: "JSON validated and saved as draft." });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: Error) =>
      toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const metadataMutation = useMutation({
    mutationFn: ({ examId, ...data }: { examId: number } & Record<string, unknown>) =>
      updateExamMetadata(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      toast({ title: "Exam updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "activate" | "deactivate" | "delete" }) => {
      if (action === "activate") return activateExam(id);
      if (action === "deactivate") return deactivateExam(id);
      return deleteExam(id);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      toast({ title: "Updated", description: `Exam ${vars.action} successful.` });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (courseId === "") {
      toast({ title: "Select a course first", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(file);
  };

  const downloadWithAuth = async (submissionId: number, filename: string) => {
    const token = localStorage.getItem("token");
    const url = downloadSubmissionUrl(submissionId);
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exams & tests</h1>
        <p className="text-muted-foreground mt-1">
          Upload JSON exam definitions, set duration (default 1 hour), click Start to open the window, manage student
          access, and download submissions.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end p-4 border rounded-xl bg-card">
        <div className="space-y-2 min-w-[200px]">
          <Label>Course</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select course…</option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {typeof c.title === "object" ? c.title.en || c.title.hy : String(c.title)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Upload exam JSON</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={courseId === "" || uploadMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {uploadMutation.isPending ? <Loader /> : <Upload size={16} />}
            Upload JSON
          </Button>
        </div>
        <a
          href="/backend/examples/linear_algebra_exam.json"
          className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary"
          onClick={(e) => {
            e.preventDefault();
            toast({
              title: "Sample JSON",
              description: "See backend/examples/linear_algebra_exam.json in the repository.",
            });
          }}
        >
          <FileJson size={14} /> Schema example
        </a>
      </div>

      {courseId === "" ? (
        <p className="text-muted-foreground text-center py-12">Select a course to manage exams.</p>
      ) : isLoading ? (
        <Loader />
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Final</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {examsData?.data?.length ? (
                examsData.data.map((exam: AdminExam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">
                      <div>{exam.title}</div>
                      {exam.is_final && (
                        <div className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                          Passing: {exam.pass_score_percentage}%
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exam.status === "active" ? "default" : "secondary"}>{exam.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {exam.is_final ? (
                        <Badge className="bg-amber-500 text-white border-none">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px] space-y-1">
                      <select
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={exam.duration_minutes}
                        disabled={metadataMutation.isPending}
                        onChange={(e) =>
                          metadataMutation.mutate({
                            examId: exam.id,
                            duration_minutes: Number(e.target.value),
                          })
                        }
                      >
                        {DURATION_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m} min{m === 60 ? " (1 hour)" : ""}
                          </option>
                        ))}
                      </select>
                      <div>{formatWindow(exam)}</div>
                    </TableCell>
                    <TableCell>{exam.question_count}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => openAccessDialog(exam)}
                      >
                        {accessLabel(exam)}
                      </button>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Edit metadata"
                        onClick={() => {
                          setEditExam(exam);
                          setEditForm({
                            title: exam.title,
                            description: exam.description || "",
                            instructions: exam.instructions || "",
                            duration_minutes: exam.duration_minutes,
                            max_attempts: exam.max_attempts,
                            is_final: exam.is_final,
                            pass_score_percentage: exam.pass_score_percentage,
                          });
                        }}
                      >
                        <Settings size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Manage student access"
                        onClick={() => openAccessDialog(exam)}
                      >
                        <UserCheck size={14} />
                      </Button>
                      {exam.status !== "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Start exam now (opens for duration)"
                          onClick={() => statusMutation.mutate({ id: exam.id, action: "activate" })}
                        >
                          <Play size={14} />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: exam.id, action: "deactivate" })}>
                          <Pause size={14} />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setMonitorExamId(exam.id)}>
                        <Users size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Grading analytics"
                        onClick={() => setAnalyticsExam(exam)}
                      >
                        <BarChart3 size={14} />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSubmissionsExamId(exam.id)}>
                        <Download size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm("Delete this exam?")) statusMutation.mutate({ id: exam.id, action: "delete" });
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No exams yet. Upload a JSON file to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={analyticsExam != null}
        onOpenChange={(o) => !o && setAnalyticsExam(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exam analytics</DialogTitle>
          </DialogHeader>
          {analyticsExam && (
            <ExamAnalyticsPanel examId={analyticsExam.id} examTitle={analyticsExam.title} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyticsExam(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submissionsExamId != null} onOpenChange={(o) => !o && setSubmissionsExamId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <span>Submissions</span>
              {submissionsExamId != null && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    const exam = examsData?.data?.find((e) => e.id === submissionsExamId);
                    if (exam) setAnalyticsExam(exam);
                  }}
                >
                  <BarChart3 size={14} />
                  Analytics
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grading</TableHead>
                <TableHead>Time</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions?.data?.map((s: ExamSubmissionRow) => (
                <TableRow key={s.id}>
                  <TableCell>{s.student_name}</TableCell>
                  <TableCell>
                    {s.score != null ? `${s.score} / ${s.max_score}` : "—"}
                  </TableCell>
                  <TableCell>
                    {s.grading_status === "pending_manual" ? (
                      <Badge variant="secondary">Review ({s.pending_manual_count ?? 0})</Badge>
                    ) : s.grading_status === "complete" ? (
                      <Badge>Done</Badge>
                    ) : (
                      <Badge variant="outline">{s.grading_status ?? "—"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{Math.round(s.time_spent_seconds / 60)}m</TableCell>
                  <TableCell className="space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      title="Grade submission"
                      onClick={() => setGradingAttemptId(s.attempt_id)}
                    >
                      <ClipboardCheck size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadWithAuth(s.id, `submission_${s.id}.json`)}
                    >
                      JSON
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmissionsExamId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accessExam != null} onOpenChange={(o) => !o && setAccessExam(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Student access — {accessExam?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Students see exams at <strong>Account → Exams</strong> when the exam is <strong>active</strong> and inside
            the live window (after you click Start). By default, every student linked to this course can take the exam.
          </p>

          <div className="space-y-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="access-mode"
                checked={!restrictAccess}
                onChange={() => setRestrictAccess(false)}
              />
              <span className="text-sm">All students in this course</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="access-mode"
                checked={restrictAccess}
                onChange={() => setRestrictAccess(true)}
              />
              <span className="text-sm">Only selected students</span>
            </label>
          </div>

          {restrictAccess && (
            <div className="flex-1 min-h-0 flex flex-col gap-2 border rounded-lg p-3">
              <Input
                placeholder="Search by name, email, or ID…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              {courseStudentsLoading ? (
                <Loader />
              ) : filteredCourseStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No students found for this course. Enroll students first.
                </p>
              ) : (
                <ul className="overflow-y-auto max-h-[240px] space-y-2 pr-1">
                  {filteredCourseStudents.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 text-sm">
                      <Checkbox
                        id={`exam-student-${s.id}`}
                        checked={selectedStudentIds.includes(s.id)}
                        onCheckedChange={(v) => toggleStudent(s.id, v === true)}
                      />
                      <label htmlFor={`exam-student-${s.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{studentDisplayName(s)}</span>
                        {s.user?.email && (
                          <span className="block text-xs text-muted-foreground">{s.user.email}</span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedStudentIds.length} student{selectedStudentIds.length === 1 ? "" : "s"} selected
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessExam(null)}>
              Cancel
            </Button>
            <Button onClick={saveAccess} disabled={accessMutation.isPending}>
              {accessMutation.isPending ? <Loader /> : "Save access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={gradingAttemptId != null}
        onOpenChange={(o) => !o && setGradingAttemptId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
          </DialogHeader>
          {gradingAttemptId != null && submissionsExamId != null && (
            <ExamGradingPanel
              attemptId={gradingAttemptId}
              examId={submissionsExamId}
              onClose={() => setGradingAttemptId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editExam != null} onOpenChange={(o) => !o && setEditExam(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Exam Metadata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.duration_minutes}
                  onChange={(e) => setEditForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
                >
                  {DURATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Max Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={editForm.max_attempts}
                  onChange={(e) => setEditForm((p) => ({ ...p, max_attempts: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 border rounded-lg bg-secondary/10">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_final"
                  checked={editForm.is_final}
                  onCheckedChange={(v) => setEditForm((p) => ({ ...p, is_final: v === true }))}
                />
                <Label htmlFor="is_final" className="cursor-pointer">Course Final Exam</Label>
              </div>
              {editForm.is_final && (
                <div className="flex items-center gap-2 flex-1">
                  <Label className="shrink-0 text-xs">Pass %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-8 w-20"
                    value={editForm.pass_score_percentage}
                    onChange={(e) => setEditForm((p) => ({ ...p, pass_score_percentage: Number(e.target.value) }))}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Final exams automatically mark enrollment as COMPLETED and issue certificates when passed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExam(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editExam) return;
                metadataMutation.mutate({
                  examId: editExam.id,
                  ...editForm,
                });
                setEditExam(null);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={monitorExamId != null} onOpenChange={(o) => !o && setMonitorExamId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Live students ({activeStudents?.count ?? 0})</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {activeStudents?.students?.map((s) => (
              <li key={s.attempt_id} className="flex justify-between border-b py-2">
                <span>{s.name}</span>
                <span className="text-muted-foreground">{Math.floor(s.elapsed_seconds / 60)}m elapsed</span>
              </li>
            ))}
            {!activeStudents?.students?.length && (
              <li className="text-muted-foreground">No active attempts right now.</li>
            )}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMonitorExamId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExams;
