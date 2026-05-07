import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminStudents,
  assignChapterToStudent,
  getStudentLessonAccess,
  grantLessonAccess,
  revokeLessonAccess,
  deleteStudent,
  updateAdminStudent,
  toggleStudentActive,
  getStudentTimeline,
  adminResetStudentPassword,
  getStudentEnrollments,
  addStudentEnrollment,
  removeStudentEnrollment,
  getAdminStudentDashboard,
} from "@/api/admin";
import type { EnrolledCourse } from "@/api/students";
import { createStudent } from "@/api/auth";
import { getCourses } from "@/api/courses";
import { getCourseCurriculum } from "@/api/courses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  XCircle,
  ShieldCheck,
  Trash2,
  History,
  Trash,
  Plus,
  Search,
  User,
  Lock,
  Activity,
  Phone,
  MapPin,
  Mail,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const StudentCoursesCell = ({ studentId }: { studentId: number }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["student-enrollments", studentId],
    queryFn: () => getStudentEnrollments(studentId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <span className="text-xs opacity-50">…</span>;
  }

  const enrollments = (data?.data || []) as any[];
  if (enrollments.length === 0) {
    return <span className="italic opacity-50">Unassigned</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {enrollments.map((e: any) => {
        const title = e?.course_title?.en || `Course #${e.course_id}`;
        return (
          <Badge key={e.id} variant="outline" className="text-[10px] font-semibold w-fit">
            {title}
          </Badge>
        );
      })}
    </div>
  );
};

const StudentProgressCell = ({ studentId }: { studentId: number }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-student-dashboard", studentId],
    queryFn: () => getAdminStudentDashboard(studentId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground opacity-50">…</div>;
  }

  const courses = (data?.courses || []) as EnrolledCourse[];
  if (courses.length === 0) {
    return <div className="text-xs text-muted-foreground italic opacity-50">No enrollments</div>;
  }

  return (
    <div className="space-y-2 min-w-[220px]">
      {courses.map((enrolled) => {
        const title = enrolled.course?.title?.en || `Course #${enrolled.course_id}`;
        const pct = enrolled.progress?.percentage ?? 0;
        const accessed = enrolled.progress?.accessed_lessons ?? 0;
        const total = enrolled.progress?.total_lessons ?? 0;
        const accessedChapters = enrolled.progress?.accessed_chapters ?? 0;
        const totalChapters = enrolled.progress?.total_chapters ?? 0;
        const isComplete = total > 0 && accessed >= total;
        return (
          <div key={enrolled.course_id} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <BookOpen size={11} className="text-primary shrink-0" />
                <span className="truncate font-semibold text-foreground" title={title}>
                  {title}
                </span>
                {isComplete && (
                  <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                )}
              </div>
              <span className="font-bold text-primary shrink-0">{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-secondary/40 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Lessons: {accessed}/{total}</span>
              <span>Chapters: {accessedChapters}/{totalChapters}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminStudents = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Main list state
  const [searchQuery, setSearchQuery] = useState("");

  // Manage dialog state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState("personal");

  // Personal edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    country: "",
  });

  // Account tab state
  const [newEnrollCourseId, setNewEnrollCourseId] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Access tab state
  const [selectedAccessCourseId, setSelectedAccessCourseId] = useState<string>("");

  // Create student dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    course_id: "",
  });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Delete dialog state
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Queries
  const { data: students, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: getAdminStudents,
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses(),
  });

  const accessCourseId = selectedAccessCourseId ? parseInt(selectedAccessCourseId) : null;

  const { data: curriculumData } = useQuery({
    queryKey: ["curriculum", accessCourseId],
    queryFn: () => getCourseCurriculum(accessCourseId!),
    enabled: !!accessCourseId,
  });

  const { data: accessData, refetch: refetchAccess } = useQuery({
    queryKey: ["student-access", selectedStudent?.id],
    queryFn: () => getStudentLessonAccess(selectedStudent.id),
    enabled: !!selectedStudent?.id && isManageOpen,
  });

  const { data: enrollmentsData, refetch: refetchEnrollments } = useQuery({
    queryKey: ["student-enrollments", selectedStudent?.id],
    queryFn: () => getStudentEnrollments(selectedStudent.id),
    enabled: !!selectedStudent?.id && isManageOpen,
  });

  const { data: timelineData } = useQuery({
    queryKey: ["student-timeline", selectedStudent?.id],
    queryFn: () => getStudentTimeline(selectedStudent.id),
    enabled: !!selectedStudent?.id && isManageOpen && manageTab === "timeline",
  });

  // Mutations
  const updateStudentMutation = useMutation({
    mutationFn: (data: any) => updateAdminStudent(selectedStudent.id, data),
    onSuccess: (updatedStudent) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setSelectedStudent((prev: any) => ({ ...prev, ...updatedStudent }));
      setIsEditing(false);
      toast({ title: "Saved", description: "Student information updated." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update student",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => toggleStudentActive(selectedStudent.id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setSelectedStudent((prev: any) => ({
        ...prev,
        user: { ...prev.user, is_active: updated?.user?.is_active ?? !prev.user?.is_active },
      }));
      toast({ title: "Updated", description: "Student status changed." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle status",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminResetStudentPassword(selectedStudent.id, newPassword),
    onSuccess: () => {
      setNewPassword("");
      toast({ title: "Password updated", description: "Student's password has been changed." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const invalidateProgress = () => {
    queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["admin-student-dashboard"] });
  };

  const grantChapterMutation = useMutation({
    mutationFn: (chapterId: number) =>
      assignChapterToStudent(selectedStudent.id, chapterId),
    onSuccess: () => {
      refetchAccess();
      invalidateProgress();
      toast({ title: "Granted", description: "Chapter access granted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to grant access", variant: "destructive" });
    },
  });

  const grantLessonMutation = useMutation({
    mutationFn: (lessonId: number) =>
      grantLessonAccess(selectedStudent.id, lessonId),
    onSuccess: () => {
      refetchAccess();
      invalidateProgress();
      toast({ title: "Granted", description: "Lesson access granted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to grant access", variant: "destructive" });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: (accessId: number) => revokeLessonAccess(accessId),
    onSuccess: () => {
      refetchAccess();
      invalidateProgress();
      toast({ title: "Revoked", description: "Access revoked." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to revoke access", variant: "destructive" });
    },
  });

  const revokeAllAccessMutation = useMutation({
    mutationFn: async () => {
      if (!accessData?.data?.length) return { ok: 0, failed: 0 };
      const results = await Promise.allSettled(
        accessData.data.map((a: any) => revokeLessonAccess(a.id))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: results.length - failed, failed };
    },
    onSuccess: (res) => {
      refetchAccess();
      invalidateProgress();
      if (res && res.failed > 0) {
        toast({
          title: "Partially revoked",
          description: `${res.ok} revoked, ${res.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Revoked", description: "All access revoked." });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to revoke access", variant: "destructive" });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
      toast({
        title: "Deleted",
        description: "Student and all related data have been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete student",
        variant: "destructive",
      });
    },
  });

  const addEnrollmentMutation = useMutation({
    mutationFn: (courseId: number) => addStudentEnrollment(selectedStudent.id, courseId),
    onSuccess: () => {
      refetchEnrollments();
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-student-dashboard"] });
      setNewEnrollCourseId("");
      toast({ title: "Enrolled", description: "Student enrolled in course." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to enroll student", variant: "destructive" });
    },
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: number) => removeStudentEnrollment(selectedStudent.id, enrollmentId),
    onSuccess: () => {
      refetchEnrollments();
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-student-dashboard"] });
      toast({ title: "Removed", description: "Enrollment removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove enrollment", variant: "destructive" });
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: () =>
      createStudent({
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        email: createForm.email,
        course_id: parseInt(createForm.course_id),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setTempPassword(data.temp_password);
      toast({ title: "Created", description: "Student account created." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create student",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleOpenManage = (student: any) => {
    setSelectedStudent(student);
    setManageTab("personal");
    setIsEditing(false);
    setEditForm({
      first_name: student.user?.first_name || "",
      last_name: student.user?.last_name || "",
      email: student.user?.email || "",
      phone: student.user?.phone || "",
      city: student.user?.city || "",
      country: student.user?.country || "",
    });
    setNewEnrollCourseId("");
    setNewPassword("");
    setShowNewPassword(false);
    const firstEnrollmentCourseId =
      student.enrollments && student.enrollments.length > 0
        ? student.enrollments[0].course_id
        : null;
    setSelectedAccessCourseId(
      (student.course_id ?? firstEnrollmentCourseId)?.toString() || ""
    );
    setIsManageOpen(true);
  };

  const handleSavePersonal = () => {
    updateStudentMutation.mutate({
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
      phone: editForm.phone || undefined,
      city: editForm.city || undefined,
      country: editForm.country || undefined,
    });
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setTempPassword(null);
    setShowPassword(false);
    setCreateForm({ first_name: "", last_name: "", email: "", course_id: "" });
  };

  const getAccessRecord = (chapterId?: number, lessonId?: number) => {
    if (!accessData?.data) return null;
    return accessData.data.find(
      (a: any) =>
        (lessonId && a.lesson_id === lessonId) ||
        (!lessonId && chapterId && a.chapter_id === chapterId && !a.lesson_id)
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), "MMM d, yyyy HH:mm");
    } catch {
      return "Invalid Date";
    }
  };

  const formatShortDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "—";
    }
  };

  const filteredStudents = (students || []).filter((s: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${s.user?.first_name} ${s.user?.last_name}`.toLowerCase();
    const email = (s.user?.email || "").toLowerCase();
    const courseTitles: string[] = [];
    if (s.course?.title?.en) courseTitles.push(s.course.title.en);
    for (const e of (s.enrollments || []) as any[]) {
      if (e?.course_title?.en) courseTitles.push(e.course_title.en);
    }
    const courseMatch = courseTitles.some((t) => t.toLowerCase().includes(q));
    return name.includes(q) || email.includes(q) || courseMatch;
  });

  if (isLoading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-secondary rounded-lg w-full" />
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">
            Manage enrolled students — personal, account, and learning data.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shrink-0"
        >
          <Plus size={16} />
          Add Student
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search by name, email, or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {/* Table */}
      <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? ( 
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-muted-foreground text-sm"
                  >
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student: any) => (
                  <tr
                    key={student.id}
                    className="hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={student.user?.profile_image} />
                          <AvatarFallback className="text-xs font-bold">
                            {student.user?.first_name?.[0]}
                            {student.user?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">
                            {student.user?.first_name} {student.user?.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID #{student.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail size={11} />
                          <span>{student.user?.email}</span>
                        </div>
                        {student.user?.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone size={11} />
                            <span>{student.user.phone}</span>
                          </div>
                        )}
                        {(student.user?.city || student.user?.country) && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin size={11} />
                            <span>
                              {[student.user?.city, student.user?.country]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      <StudentCoursesCell studentId={student.id} />
                    </td>
                    <td className="px-6 py-4">
                      <StudentProgressCell studentId={student.id} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            student.user?.is_active ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {student.user?.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {student.status && (
                          <div className="text-[10px] text-muted-foreground uppercase tracking-tight">
                            {student.status}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {formatShortDate(student.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenManage(student)}
                        >
                          Manage
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setStudentToDelete(student);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Manage Student Dialog ── */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-[860px] max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="text-primary" />
              {selectedStudent?.user?.first_name} {selectedStudent?.user?.last_name}
              <span className="text-muted-foreground text-sm font-normal ml-1">
                — ID #{selectedStudent?.id}
              </span>
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={manageTab}
            onValueChange={(v) => { setManageTab(v); setIsEditing(false); }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-secondary/20">
                {[
                  { value: "personal", icon: User, label: "Personal" },
                  { value: "account", icon: Lock, label: "Account" },
                  { value: "access", icon: ShieldCheck, label: "Access" },
                  { value: "timeline", icon: Activity, label: "Timeline" },
                ].map(({ value, icon: Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="py-2 text-[10px] uppercase font-bold tracking-widest gap-1.5"
                  >
                    <Icon size={12} />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* ── Personal Tab ── */}
              <TabsContent value="personal" className="mt-0 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                    Personal Information
                  </h3>
                  {!isEditing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSavePersonal}
                        disabled={updateStudentMutation.isPending}
                      >
                        {updateStudentMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Profile picture */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/10 border border-border">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedStudent?.user?.profile_image} />
                    <AvatarFallback className="text-xl font-bold">
                      {selectedStudent?.user?.first_name?.[0]}
                      {selectedStudent?.user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground text-lg">
                      {selectedStudent?.user?.first_name}{" "}
                      {selectedStudent?.user?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedStudent?.user?.email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Role: {selectedStudent?.user?.role} · UID #{selectedStudent?.user?.id}
                    </div>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "first_name", label: "First Name", icon: User },
                    { key: "last_name", label: "Last Name", icon: User },
                    { key: "email", label: "Email", icon: Mail },
                    { key: "phone", label: "Phone", icon: Phone },
                    { key: "city", label: "City", icon: MapPin },
                    { key: "country", label: "Country", icon: MapPin },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                        <Icon size={11} />
                        {label}
                      </Label>
                      {isEditing ? (
                        <Input
                          value={(editForm as any)[key]}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className="bg-background h-9 text-sm"
                        />
                      ) : (
                        <div className="h-9 flex items-center px-3 rounded-md border border-border bg-secondary/10 text-sm text-foreground">
                          {(editForm as any)[key] || (
                            <span className="text-muted-foreground italic text-xs">
                              Not set
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Read-only metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Account Created
                    </div>
                    <div className="text-sm text-foreground flex items-center gap-1.5">
                      <Calendar size={12} className="text-muted-foreground" />
                      {formatDate(selectedStudent?.user?.created_at)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Student Since
                    </div>
                    <div className="text-sm text-foreground flex items-center gap-1.5">
                      <Calendar size={12} className="text-muted-foreground" />
                      {formatDate(selectedStudent?.created_at)}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── Account Tab ── */}
              <TabsContent value="account" className="mt-0 space-y-6">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                  Account Settings
                </h3>

                {/* Active status */}
                <div className="p-4 rounded-xl bg-secondary/10 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                        Account Status
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            selectedStudent?.user?.is_active
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedStudent?.user?.is_active
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {selectedStudent?.user?.is_active
                            ? "Student can log in and access materials"
                            : "Student cannot log in"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0"
                      onClick={() => toggleActiveMutation.mutate()}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {selectedStudent?.user?.is_active ? (
                        <>
                          <ToggleRight size={14} className="text-primary" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={14} />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Enrollment status */}
                <div className="p-4 rounded-xl bg-secondary/10 border border-border space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Enrollment Status
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {selectedStudent?.status || "—"}
                    </Badge>
                  </div>
                </div>

                {/* Enrollment manager */}
                <div className="space-y-3 p-4 rounded-xl bg-secondary/10 border border-border">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Course Enrollments
                  </div>

                  {/* Current enrollments list */}
                  {enrollmentsData?.data?.length > 0 ? (
                    <div className="space-y-2">
                      {enrollmentsData.data.map((enrollment: any) => (
                        <div key={enrollment.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">
                              {enrollment.course_title?.en || `Course #${enrollment.course_id}`}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase">{enrollment.status}</Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => removeEnrollmentMutation.mutate(enrollment.id)}
                            disabled={removeEnrollmentMutation.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No course enrollments.</div>
                  )}

                  {/* Add enrollment */}
                  <div className="flex items-end gap-2 pt-1">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                        Add Course
                      </Label>
                      <Select value={newEnrollCourseId} onValueChange={setNewEnrollCourseId}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                          {(courses || [])
                            .filter((c: any) => !enrollmentsData?.data?.some((e: any) => e.course_id === c.id))
                            .map((course: any) => (
                              <SelectItem key={course.id} value={course.id.toString()}>
                                {course.title?.en}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addEnrollmentMutation.mutate(parseInt(newEnrollCourseId))}
                      disabled={!newEnrollCourseId || addEnrollmentMutation.isPending}
                      className="shrink-0"
                    >
                      Enroll
                    </Button>
                  </div>
                </div>

                {/* Password reset */}
                <div className="space-y-3 p-4 rounded-xl bg-secondary/10 border border-border">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Change Password
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="New password (min. 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-background pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resetPasswordMutation.mutate()}
                      disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                      className="shrink-0"
                    >
                      {resetPasswordMutation.isPending ? "Saving..." : "Set Password"}
                    </Button>
                  </div>
                </div>

                {/* Social links */}
                {selectedStudent?.user?.social_links &&
                  Object.keys(selectedStudent.user.social_links).length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl bg-secondary/10 border border-border">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Social Links
                      </div>
                      <div className="space-y-2">
                        {Object.entries(
                          selectedStudent.user.social_links as Record<
                            string,
                            string
                          >
                        ).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                              {key}
                            </span>
                            <a
                              href={value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs truncate max-w-[240px]"
                            >
                              {value}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </TabsContent>

              {/* ── Access Tab ── */}
              <TabsContent value="access" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                    Access Management
                  </h3>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">
                      {accessData?.total || 0} active permissions
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 gap-1.5"
                      onClick={() => {
                        if (confirm("Revoke all access for this student?")) {
                          revokeAllAccessMutation.mutate();
                        }
                      }}
                    >
                      <Trash size={12} />
                      Revoke All
                    </Button>
                  </div>
                </div>

                {/* Course selector for access management */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70 shrink-0">Course</Label>
                  <Select value={selectedAccessCourseId} onValueChange={setSelectedAccessCourseId}>
                    <SelectTrigger className="bg-background flex-1">
                      <SelectValue placeholder="Select a course to manage access" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const enrolledIds = new Set<number>();
                        (enrollmentsData?.data || []).forEach((e: any) => {
                          if (e?.course_id != null) enrolledIds.add(e.course_id);
                        });
                        if (selectedStudent?.course_id != null) enrolledIds.add(selectedStudent.course_id);
                        const list = (courses || []).filter((c: any) => enrolledIds.size === 0 || enrolledIds.has(c.id));
                        return list.map((course: any) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.title?.en}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-6">
                  {curriculumData?.curriculum?.map((chapter: any) => {
                    const chapterAccess = getAccessRecord(
                      chapter.chapter.id,
                      undefined
                    );
                    const isChapterGranted = !!chapterAccess;

                    return (
                      <div
                        key={chapter.chapter.id}
                        className="space-y-3 rounded-xl border border-border bg-card/50 overflow-hidden"
                      >
                        <div className="bg-secondary/30 px-4 py-3 flex items-center justify-between border-b border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {chapter.chapter.order_index}
                            </div>
                            <h4 className="text-sm font-bold text-foreground uppercase tracking-tight italic">
                              {chapter.chapter.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-4">
                            {isChapterGranted && (
                              <div className="text-[10px] text-right">
                                <div className="text-muted-foreground font-bold uppercase tracking-tighter opacity-50">
                                  Granted on
                                </div>
                                <div className="text-foreground font-black tracking-tighter">
                                  {formatDate(chapterAccess.granted_at)}
                                </div>
                              </div>
                            )}
                            {isChapterGranted ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 border border-destructive/20"
                                onClick={() =>
                                  revokeAccessMutation.mutate(chapterAccess.id)
                                }
                              >
                                <XCircle size={14} />
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 gap-2 border-primary/30"
                                onClick={() =>
                                  grantChapterMutation.mutate(chapter.chapter.id)
                                }
                              >
                                <ShieldCheck size={14} />
                                Grant
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="p-3 space-y-2 bg-background/30">
                          {chapter.lessons.map((lesson: any) => {
                            const lessonAccess = getAccessRecord(
                              undefined,
                              lesson.id
                            );
                            const isLessonGranted = !!lessonAccess;
                            const isEffectivelyGranted =
                              isChapterGranted || isLessonGranted;
                            const accessedAt =
                              lessonAccess?.accessed_at ||
                              (isChapterGranted
                                ? chapterAccess.accessed_at
                                : null);

                            return (
                              <div
                                key={lesson.id}
                                className={`flex items-center justify-between p-2 pl-4 rounded-lg border transition-all duration-200 ${
                                  isEffectivelyGranted
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-secondary/5 border-border/50 opacity-70"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {isEffectivelyGranted ? (
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                      <CheckCircle2
                                        className="text-emerald-500"
                                        size={12}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-secondary/50 flex items-center justify-center">
                                      <XCircle
                                        className="text-muted-foreground/30"
                                        size={12}
                                      />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span
                                      className={`text-[11px] font-bold uppercase tracking-tight ${
                                        isEffectivelyGranted
                                          ? "text-foreground"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {lesson.title}
                                    </span>
                                    {accessedAt && (
                                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                        <History size={10} />
                                        Last accessed: {formatDate(accessedAt)}
                                      </div>
                                    )}
                                  </div>
                                  {isChapterGranted && isLessonGranted && (
                                    <Badge
                                      variant="outline"
                                      className="text-[8px] h-4 px-1 opacity-50"
                                    >
                                      Duplicate
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {isChapterGranted ? (
                                    <span className="text-[9px] font-black uppercase text-emerald-500/60 pr-2 tracking-tighter italic">
                                      Chapter Access
                                    </span>
                                  ) : isLessonGranted ? (
                                    <div className="flex items-center gap-3">
                                      <div className="text-[9px] text-right">
                                        <div className="text-muted-foreground opacity-50 uppercase font-bold tracking-tighter">
                                          Granted
                                        </div>
                                        <div className="text-foreground font-black tracking-tighter">
                                          {formatDate(lessonAccess.granted_at)}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                        onClick={() =>
                                          revokeAccessMutation.mutate(
                                            lessonAccess.id
                                          )
                                        }
                                      >
                                        Revoke
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                                      onClick={() =>
                                        grantLessonMutation.mutate(lesson.id)
                                      }
                                    >
                                      Grant
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {!selectedAccessCourseId && (
                    <div className="text-sm text-muted-foreground italic p-4 rounded-xl border border-border bg-secondary/10">
                      Select a course above to manage chapter and lesson access.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Timeline Tab ── */}
              <TabsContent value="timeline" className="mt-0 space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                  Activity Timeline
                </h3>

                {timelineData ? (
                  <>
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Registrations",
                          value: timelineData.statistics?.total_registrations,
                        },
                        {
                          label: "Materials Granted",
                          value: timelineData.statistics?.materials_granted,
                        },
                        {
                          label: "Materials Accessed",
                          value: timelineData.statistics?.materials_accessed,
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="p-3 rounded-xl bg-secondary/10 border border-border text-center"
                        >
                          <div className="text-2xl font-black text-foreground">
                            {value ?? 0}
                          </div>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Timeline events */}
                    <div className="space-y-2">
                      {timelineData.timeline?.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic p-4 text-center">
                          No activity recorded yet.
                        </div>
                      ) : (
                        timelineData.timeline?.map(
                          (event: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/5"
                            >
                              <div
                                className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                  event.type === "registration"
                                    ? "bg-blue-500/20"
                                    : "bg-emerald-500/20"
                                }`}
                              >
                                {event.type === "registration" ? (
                                  <User size={12} className="text-blue-500" />
                                ) : (
                                  <BookOpen
                                    size={12}
                                    className="text-emerald-500"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground">
                                  {event.details}
                                </div>
                                {event.type === "registration" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] mt-1 uppercase"
                                  >
                                    {event.status}
                                  </Badge>
                                )}
                                {event.type === "material_access" && event.accessed && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    Accessed: {formatDate(event.accessed_at)}
                                  </div>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground shrink-0">
                                {formatShortDate(event.date)}
                              </div>
                            </div>
                          )
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-14 bg-secondary/30 rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <div className="p-6 border-t border-border bg-secondary/10 shrink-0">
            <DialogFooter>
              <Button
                onClick={() => setIsManageOpen(false)}
                className="w-full sm:w-auto"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Student Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) handleCloseCreate(); else setIsCreateOpen(true); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} className="text-primary" />
              Add New Student
            </DialogTitle>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-sm font-semibold text-emerald-500 mb-1">
                  Student created successfully!
                </div>
                <div className="text-xs text-muted-foreground">
                  Share these credentials with the student. The password cannot be recovered after closing this dialog.
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Email
                  </Label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-border bg-secondary/10 text-sm">
                    {createForm.email}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Temporary Password
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 h-9 flex items-center px-3 rounded-md border border-border bg-secondary/10 text-sm font-mono">
                      {showPassword ? tempPassword : "••••••••••••"}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => setShowPassword((p) => !p)}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        toast({ title: "Copied", description: "Password copied to clipboard." });
                      }}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseCreate} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                    First Name
                  </Label>
                  <Input
                    value={createForm.first_name}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        first_name: e.target.value,
                      }))
                    }
                    placeholder="John"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Last Name
                  </Label>
                  <Input
                    value={createForm.last_name}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        last_name: e.target.value,
                      }))
                    }
                    placeholder="Doe"
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Email
                </Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="john.doe@example.com"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Course
                </Label>
                <Select
                  value={createForm.course_id}
                  onValueChange={(val) =>
                    setCreateForm((p) => ({ ...p, course_id: val }))
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {(courses || []).map((course: any) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title?.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={handleCloseCreate}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createStudentMutation.mutate()}
                  disabled={
                    !createForm.first_name ||
                    !createForm.last_name ||
                    !createForm.email ||
                    !createForm.course_id ||
                    createStudentMutation.isPending
                  }
                >
                  {createStudentMutation.isPending
                    ? "Creating..."
                    : "Create Student"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Student
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 text-foreground">
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {studentToDelete?.user?.first_name}{" "}
                {studentToDelete?.user?.last_name}
              </strong>
              ?
            </AlertDialogDescription>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              <p className="font-semibold mb-1">
                This action cannot be undone. The following will be deleted:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Student account and profile</li>
                <li>All course registrations</li>
                <li>All enrollments and progress</li>
                <li>All projects</li>
                <li>All certificates</li>
                <li>User account</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStudentMutation.mutate(studentToDelete.id)}
              disabled={deleteStudentMutation.isPending}
              className="flex-1 bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteStudentMutation.isPending
                ? "Deleting..."
                : "Delete Student"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudents;
