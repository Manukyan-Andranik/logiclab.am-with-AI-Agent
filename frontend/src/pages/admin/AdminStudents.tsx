import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminStudents,
  updateStudentProgress,
  assignChapterToStudent,
  getStudentLessonAccess,
  grantLessonAccess,
  revokeLessonAccess,
  deleteStudent
} from "@/api/admin";
import { getCourseCurriculum } from "@/api/courses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { BookOpen, GraduationCap, CheckCircle2, ChevronRight, XCircle, ShieldCheck, Trash2, History, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const AdminStudents = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: getAdminStudents,
  });

  const { data: curriculumData } = useQuery({
    queryKey: ["curriculum", selectedStudent?.course_id],
    queryFn: () => getCourseCurriculum(selectedStudent.course_id),
    enabled: !!selectedStudent?.course_id,
  });

  const { data: accessData, refetch: refetchAccess } = useQuery({
    queryKey: ["student-access", selectedStudent?.id],
    queryFn: () => getStudentLessonAccess(selectedStudent.id),
    enabled: !!selectedStudent?.id,
  });

  const progressMutation = useMutation({
    mutationFn: (data: { chapter_id?: number, lesson_id?: number }) =>
      updateStudentProgress(selectedStudent.id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setSelectedStudent((prev: any) => ({
        ...prev,
        ...variables
      }));
      toast({ title: "Success", description: "Student progress updated." });
    },
  });

  const grantChapterMutation = useMutation({
    mutationFn: (chapterId: number) => assignChapterToStudent(selectedStudent.id, chapterId),
    onSuccess: () => {
      refetchAccess();
      toast({ title: "Success", description: "Chapter access granted." });
    },
  });

  const grantLessonMutation = useMutation({
    mutationFn: (lessonId: number) => grantLessonAccess(selectedStudent.id, lessonId),
    onSuccess: () => {
      refetchAccess();
      toast({ title: "Success", description: "Lesson access granted." });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: (accessId: number) => revokeLessonAccess(accessId),
    onSuccess: () => {
      refetchAccess();
      toast({ title: "Success", description: "Access revoked." });
    },
  });

  const revokeAllAccessMutation = useMutation({
    mutationFn: async () => {
      if (!accessData?.data) return;
      // Sequential deletion to avoid race conditions and overwhelming the server
      for (const access of accessData.data) {
        await revokeLessonAccess(access.id);
      }
    },
    onSuccess: () => {
      refetchAccess();
      toast({ title: "Success", description: "All access revoked." });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
      toast({ 
        title: "Success", 
        description: "Student and all related data have been deleted." 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete student",
        variant: "destructive"
      });
    }
  });

  const handleManageProgress = (student: any) => {
    setSelectedStudent(student);
    setIsProgressOpen(true);
  };

  const getAccessRecord = (chapterId?: number, lessonId?: number) => {
    if (!accessData?.data) return null;
    return accessData.data.find((a: any) =>
      (lessonId && a.lesson_id === lessonId) || (!lessonId && chapterId && a.chapter_id === chapterId && !a.lesson_id)
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), "MMM d, yyyy HH:mm");
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-12 bg-secondary rounded-lg w-full" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Students</h1>
        <p className="text-muted-foreground">Manage enrolled students and their progress.</p>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Course</th>
              <th className="px-6 py-4">Current Progress</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students?.map((student) => (
              <tr key={student.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={student.user?.profile_image} />
                    <AvatarFallback>{student.user?.first_name[0]}{student.user?.last_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground">{student.user?.first_name} {student.user?.last_name}</div>
                    <div className="text-xs text-muted-foreground">{student.user?.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{student.course?.title?.en || 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={12} className="text-primary" />
                      <span>Chapter ID: {student.last_chapter_id || 'None'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ChevronRight size={12} className="text-primary" />
                      <span>Lesson ID: {student.last_lesson_id || 'None'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={student.is_active ? "default" : "secondary"}>
                    {student.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleManageProgress(student)}
                    >
                      Manage Student
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
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
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="text-primary" />
              Manage: {selectedStudent?.user?.first_name} {selectedStudent?.user?.last_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Set Current Position</h3>
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/10 border border-border">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Current Chapter</Label>
                  <Select
                    value={selectedStudent?.last_chapter_id?.toString()}
                    onValueChange={(val) => {
                      const chapterId = parseInt(val);
                      const firstLesson = curriculumData?.curriculum.find((c: any) => c.chapter.id === chapterId)?.lessons[0];
                      progressMutation.mutate({ 
                        chapter_id: chapterId,
                        lesson_id: firstLesson?.id
                      });
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {curriculumData?.curriculum.map((item: any) => (
                        <SelectItem key={item.chapter.id} value={item.chapter.id.toString()}>
                          {item.chapter.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Current Lesson</Label>
                  <Select
                    value={selectedStudent?.last_lesson_id?.toString()}
                    onValueChange={(val) => progressMutation.mutate({ lesson_id: parseInt(val) })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {curriculumData?.curriculum
                        .find((item: any) => item.chapter.id === selectedStudent?.last_chapter_id)
                        ?.lessons.map((lesson: any) => (
                          <SelectItem key={lesson.id} value={lesson.id.toString()}>
                            {lesson.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Access Management</h3>
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

              <Tabs defaultValue="curriculum" className="space-y-4">
                <TabsList className="grid w-full grid-cols-1 h-auto p-1 bg-secondary/20">
                  <TabsTrigger value="curriculum" className="py-2 text-xs uppercase font-bold tracking-widest">
                    Course Curriculum & Access
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="curriculum" className="space-y-6">
                  {curriculumData?.curriculum.map((chapter: any) => {
                    const chapterAccess = getAccessRecord(chapter.chapter.id, undefined);
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
                                <div className="text-muted-foreground font-bold uppercase tracking-tighter opacity-50">Granted on</div>
                                <div className="text-foreground font-black tracking-tighter">{formatDate(chapterAccess.granted_at)}</div>
                              </div>
                            )}

                            {isChapterGranted ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 border border-destructive/20"
                                onClick={() => revokeAccessMutation.mutate(chapterAccess.id)}
                              >
                                <XCircle size={14} />
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 gap-2 border-primary/30"
                                onClick={() => grantChapterMutation.mutate(chapter.chapter.id)}
                              >
                                <ShieldCheck size={14} />
                                Grant
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="p-3 space-y-2 bg-background/30">
                          {chapter.lessons.map((lesson: any) => {
                            const lessonAccess = getAccessRecord(undefined, lesson.id);
                            const isLessonGranted = !!lessonAccess;
                            const isEffectivelyGranted = isChapterGranted || isLessonGranted;
                            const accessedAt = lessonAccess?.accessed_at || (isChapterGranted ? chapterAccess.accessed_at : null);

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
                                      <CheckCircle2 className="text-emerald-500" size={12} />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-secondary/50 flex items-center justify-center">
                                      <XCircle className="text-muted-foreground/30" size={12} />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className={`text-[11px] font-bold uppercase tracking-tight ${isEffectivelyGranted ? "text-foreground" : "text-muted-foreground"}`}>
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
                                    <Badge variant="outline" className="text-[8px] h-4 px-1 opacity-50">Duplicate Access</Badge>
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
                                        <div className="text-muted-foreground opacity-50 uppercase font-bold tracking-tighter">Granted</div>
                                        <div className="text-foreground font-black tracking-tighter">{formatDate(lessonAccess.granted_at)}</div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                        onClick={() => revokeAccessMutation.mutate(lessonAccess.id)}
                                      >
                                        Revoke
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                                      onClick={() => grantLessonMutation.mutate(lesson.id)}
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
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="p-6 border-t border-border bg-secondary/10">
            <DialogFooter>
              <Button onClick={() => setIsProgressOpen(false)} className="w-full sm:w-auto">Done</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Student Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Student</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 text-foreground">
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{studentToDelete?.user?.first_name} {studentToDelete?.user?.last_name}</strong>?
            </AlertDialogDescription>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              <p className="font-semibold mb-1">⚠️ This action cannot be undone. The following will be deleted:</p>
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
              {deleteStudentMutation.isPending ? "Deleting..." : "Delete Student"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudents;
