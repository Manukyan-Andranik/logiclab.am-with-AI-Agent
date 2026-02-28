import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminStudents, updateStudentProgress, assignChapterToStudent } from "@/api/admin";
import { getCourseCurriculum } from "@/api/courses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
import Button from "@/components/ui/Button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { BookOpen, GraduationCap, CheckCircle2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminStudents = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: getAdminStudents,
  });

  const { data: curriculumData, isLoading: isCurriculumLoading } = useQuery({
    queryKey: ["curriculum", selectedStudent?.course_id],
    queryFn: () => getCourseCurriculum(selectedStudent.course_id),
    enabled: !!selectedStudent?.course_id,
  });

  const progressMutation = useMutation({
    mutationFn: (data: { chapter_id?: number, lesson_id?: number }) => 
      updateStudentProgress(selectedStudent.id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      // Update local state to reflect changes in the UI immediately
      setSelectedStudent((prev: any) => ({
        ...prev,
        ...variables
      }));
      toast({ title: "Success", description: "Student progress updated." });
    },
  });

  const assignChapterMutation = useMutation({
    mutationFn: (chapterId: number) => assignChapterToStudent(selectedStudent.id, chapterId),
    onSuccess: () => {
      toast({ title: "Success", description: "Chapter access granted." });
    },
  });

  const handleManageProgress = (student: any) => {
    setSelectedStudent(student);
    setIsProgressOpen(true);
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
                  <Button variant="outline" size="sm" onClick={() => handleManageProgress(student)}>
                    Manage Progress
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress Management Dialog */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="text-primary" />
              Manage Progress: {selectedStudent?.user?.first_name} {selectedStudent?.user?.last_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* Set Current Chapter/Lesson */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Set Current Position</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Chapter</Label>
                  <Select 
                    value={selectedStudent?.last_chapter_id?.toString()} 
                    onValueChange={(val) => progressMutation.mutate({ chapter_id: parseInt(val) })}
                  >
                    <SelectTrigger>
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
                  <Label>Current Lesson</Label>
                  <Select 
                    value={selectedStudent?.last_lesson_id?.toString()}
                    onValueChange={(val) => progressMutation.mutate({ lesson_id: parseInt(val) })}
                  >
                    <SelectTrigger>
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

            {/* Assign Access to Chapters */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Grant Chapter Access</h3>
              <p className="text-xs text-muted-foreground">Marking a chapter as accessed allows the student to view its contents.</p>
              <div className="space-y-2">
                {curriculumData?.curriculum.map((item: any) => (
                  <div key={item.chapter.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border">
                    <span className="text-sm font-medium">{item.chapter.title}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
                      onClick={() => assignChapterMutation.mutate(item.chapter.id)}
                    >
                      <CheckCircle2 size={14} />
                      Grant Access
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsProgressOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudents;
