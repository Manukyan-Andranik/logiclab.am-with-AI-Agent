import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCourses, deleteCourse, createCourse, updateCourse, getCourseCurriculum,
  createChapter, updateChapter, deleteChapter,
  createLesson, updateLesson, deleteLesson
} from "@/api/courses";
import { getInstructors } from "@/api/instructors";
import { uploadFile, getMediaUrl } from "@/api/client";
import { getLocalizedContent } from "@/lib/localization";
import { useToast } from "@/hooks/use-toast";
// import { Button } from "@/components/ui/button";
import Button from "@/components/ui/Button";
import { Plus, Edit2, Trash2, Globe, Users, BookOpen, ChevronDown, ChevronUp, FileText, Video, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Course, Instructor, Chapter, Lesson } from "@/api/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getLessonMaterials, createOrUpdateLessonMaterials } from "@/api/admin";

const AdminCourses = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [curriculumCourse, setCurriculumCourse] = useState<Course | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Chapter & Lesson state
  const [isChapterDialogOpen, setIsChapterOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [targetChapterId, setTargetChapterId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title_hy: "",
    title_en: "",
    title_ru: "",
    description_hy: "",
    description_en: "",
    description_ru: "",
    duration_months: 3,
    monthly_payment: 50000,
    order_index: 0,
    is_active: true,
    category: "course" as "course" | "profession",
    level: "Սկսնակ",
    icon_url: "",
    hero_video_url: "",
    instructor_ids: [] as number[],
  });

  const [chapterFormData, setChapterFormData] = useState({
    title: "",
    order_index: 0,
  });

  const [lessonFormData, setLessonFormData] = useState<{
    title: string;
    order_index: number;
    materials: { name: string; url: string }[];
  }>({
    title: "",
    order_index: 0,
    materials: [{ name: "", url: "" }],
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => getCourses(),
  });

  const { data: instructors } = useQuery({
    queryKey: ["admin-instructors"],
    queryFn: getInstructors,
  });

  const { data: curriculumData, isLoading: isCurriculumLoading } = useQuery({
    queryKey: ["admin-curriculum"],
    queryFn: () => getCourseCurriculum(curriculumCourse!.id),
    enabled: !!curriculumCourse,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        title: { hy: data.title_hy, en: data.title_en, ru: data.title_ru },
        description: { hy: data.description_hy, en: data.description_en, ru: data.description_ru },
        duration_months: data.duration_months,
        monthly_payment: data.monthly_payment,
        order_index: data.order_index,
        is_active: data.is_active,
        category: data.category,
        level: data.level,
        icon_url: data.icon_url,
        hero_video_url: data.hero_video_url,
        instructor_ids: data.instructor_ids,
      };
      return editingCourse
        ? updateCourse(editingCourse.id, payload as any)
        : createCourse(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Success", description: `Course ${editingCourse ? "updated" : "created"} successfully.` });
      setIsOpen(false);
      resetForm();
    },
  });

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploading(true);
    try {
      const { url } = await uploadFile(file);
      setFormData(prev => ({ ...prev, hero_video_url: url }));
      toast({ title: "Success", description: "Video uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setVideoUploading(false);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIconUploading(true);
    try {
      const { url } = await uploadFile(file);
      setFormData(prev => ({ ...prev, icon_url: url }));
      toast({ title: "Success", description: "Icon uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIconUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Deleted", description: "Course has been removed." });
    },
  });

  // Chapter Mutations
  const chapterMutation = useMutation({
    mutationFn: (data: typeof chapterFormData) => {
      if (editingChapter) return updateChapter(editingChapter.id, data);
      return createChapter(curriculumCourse!.id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] });
      toast({ title: "Success", description: `Chapter ${editingChapter ? "updated" : "created"} successfully.` });
      setIsChapterOpen(false);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: (id: number) => deleteChapter(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] });
      toast({ title: "Deleted", description: "Chapter removed." });
    },
  });

  // Lesson Mutations
  const lessonMutation = useMutation({
    mutationFn: async (data: typeof lessonFormData) => {
      // Only send supported lesson fields to the lesson API
      const lessonPayload = {
        title: data.title,
        order_index: data.order_index,
      };

      let savedLesson: Lesson;

      if (editingLesson) {
        savedLesson = await updateLesson(editingLesson.id, lessonPayload as any);
      } else {
        savedLesson = await createLesson(targetChapterId!, lessonPayload as any);
      }

      // Handle materials via dedicated materials API
      const cleanedLinks = data.materials
        .filter((m) => m.url.trim().length > 0)
        .map((m) => ({
          name: m.name && m.name.trim().length > 0 ? m.name.trim() : m.url.trim(),
          url: m.url.trim(),
        }));

      if (cleanedLinks.length > 0) {
        await createOrUpdateLessonMaterials(savedLesson.id, cleanedLinks);
      }

      return savedLesson;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] });
      toast({ title: "Success", description: `Lesson ${editingLesson ? "updated" : "created"} successfully.` });
      setIsLessonOpen(false);
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: number) => deleteLesson(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] });
      toast({ title: "Deleted", description: "Lesson removed." });
    },
  });

  const resetForm = () => {
    setFormData({
      title_hy: "",
      title_en: "",
      title_ru: "",
      description_hy: "",
      description_en: "",
      description_ru: "",
      duration_months: 3,
      monthly_payment: 50000,
      order_index: 0,
      is_active: true,
      category: "course",
      level: "Սկսնակ",
      icon_url: "",
      hero_video_url: "",
      instructor_ids: [],
    });
    setEditingCourse(null);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title_hy: course.title.hy || "",
      title_en: course.title.en || "",
      title_ru: course.title.ru || "",
      description_hy: course.description.hy || "",
      description_en: course.description.en || "",
      description_ru: course.description.ru || "",
      duration_months: course.duration_months,
      monthly_payment: course.monthly_payment,
      order_index: course.order_index || 0,
      is_active: course.is_active,
      category: course.category || "course",
      level: course.level || "Սկսնակ",
      icon_url: course.icon_url || "",
      hero_video_url: course.hero_video_url || "",
      instructor_ids: course.instructors?.map(i => i.id) || [],
    });
    setIsOpen(true);
  };

  const handleManageCurriculum = (course: Course) => {
    setCurriculumCourse(course);
    setIsCurriculumOpen(true);
  };

  const toggleInstructor = (id: number) => {
    setFormData(prev => ({
      ...prev,
      instructor_ids: prev.instructor_ids.includes(id)
        ? prev.instructor_ids.filter(i => i !== id)
        : [...prev.instructor_ids, id]
    }));
  };

  const handleAddChapter = () => {
    setEditingChapter(null);
    setChapterFormData({ title: "", order_index: (curriculumData?.curriculum.length || 0) + 1 });
    setIsChapterOpen(true);
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterFormData({ title: chapter.title, order_index: chapter.order_index });
    setIsChapterOpen(true);
  };

  const handleAddLesson = (chapterId: number, currentLessonsCount: number) => {
    setTargetChapterId(chapterId);
    setEditingLesson(null);
    setLessonFormData({
      title: "",
      order_index: currentLessonsCount + 1,
      materials: [{ name: "", url: "" }],
    });
    setIsLessonOpen(true);
  };

  const handleEditLesson = async (lesson: Lesson) => {
    setEditingLesson(lesson);

    // Try to load existing materials for this lesson
    try {
      const material = await getLessonMaterials(lesson.id);
      const links = Array.isArray(material?.links) ? material.links : [];
      setLessonFormData({
        title: lesson.title,
        order_index: lesson.order_index,
        materials: links.length > 0 ? links : [{ name: "", url: "" }],
      });
    } catch {
      // If no materials yet or error, just initialize with empty row
      setLessonFormData({
        title: lesson.title,
        order_index: lesson.order_index,
        materials: [{ name: "", url: "" }],
      });
    }

    setIsLessonOpen(true);
  };

  const handleAddMaterialRow = () => {
    setLessonFormData((prev) => ({
      ...prev,
      materials: [...prev.materials, { name: "", url: "" }],
    }));
  };

  const handleRemoveMaterialRow = (index: number) => {
    setLessonFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const handleMaterialChange = (index: number, field: "name" | "url", value: string) => {
    setLessonFormData((prev) => ({
      ...prev,
      materials: prev.materials.map((m, i) =>
        i === index
          ? {
              ...m,
              [field]: value,
            }
          : m
      ),
    }));
  };

  const isSupportedMaterialSource = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host.includes("colab.research.google.com") ||
        host.includes("youtube.com") ||
        host.includes("youtu.be") ||
        host.includes("drive.google.com") ||
        host.includes("docs.google.com")
      );
    } catch {
      return false;
    }
  };

  const sortedCourses = courses ? [...courses].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) : [];

  if (isLoading) return <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"><div className="h-48 bg-secondary rounded-xl" /><div className="h-48 bg-secondary rounded-xl" /><div className="h-48 bg-secondary rounded-xl" /></div>;

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Manage your educational programs.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="primary" className="gap-2 bg-primary/10 text-white hover:bg-primary/20 text">
              <Plus size={18} />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit Course" : "Add New Course"}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="hy" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="hy">Armenian (HY)</TabsTrigger>
                <TabsTrigger value="en">English (EN)</TabsTrigger>
                <TabsTrigger value="ru">Russian (RU)</TabsTrigger>
              </TabsList>

              {(['hy', 'en', 'ru'] as const).map((lang) => (
                <TabsContent key={lang} value={lang} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor={`title_${lang}`}>Title ({lang.toUpperCase()})</Label>
                    <Input
                      id={`title_${lang}`}
                      value={formData[`title_${lang}` as keyof typeof formData] as string}
                      onChange={e => setFormData({ ...formData, [`title_${lang}`]: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`description_${lang}`}>Description ({lang.toUpperCase()})</Label>
                    <Textarea
                      id={`description_${lang}`}
                      className="min-h-[150px]"
                      value={formData[`description_${lang}` as keyof typeof formData] as string}
                      onChange={e => setFormData({ ...formData, [`description_${lang}`]: e.target.value })}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="grid gap-6 py-4 border-t border-border mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (months)</Label>
                  <Input id="duration" type="number" value={formData.duration_months} onChange={e => setFormData({ ...formData, duration_months: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment">Monthly Payment (AMD)</Label>
                  <Input id="payment" type="number" value={formData.monthly_payment} onChange={e => setFormData({ ...formData, monthly_payment: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order_index">Order Index</Label>
                  <Input id="order_index" type="number" value={formData.order_index} onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  >
                    <option value="course">Course</option>
                    <option value="profession">Profession</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input id="level" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon_url">Icon URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="icon_url"
                    placeholder="Icon URL or upload"
                    value={formData.icon_url}
                    onChange={e => setFormData({ ...formData, icon_url: e.target.value })}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={iconInputRef}
                    onChange={handleIconUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={iconUploading}
                  >
                    {iconUploading ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero_video_url">Hero Video</Label>
                <div className="flex gap-2">
                  <Input
                    id="hero_video_url"
                    placeholder="Video URL or upload"
                    value={formData.hero_video_url}
                    onChange={e => setFormData({ ...formData, hero_video_url: e.target.value })}
                  />
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    ref={videoInputRef}
                    onChange={handleVideoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={videoUploading}
                  >
                    {videoUploading ? <Loader2 className="animate-spin" size={18} /> : <Video size={18} />}
                  </Button>
                  {formData.hero_video_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setFormData({ ...formData, hero_video_url: "" })}
                    >
                      <X size={18} />
                    </Button>
                  )}
                </div>
                {formData.hero_video_url && (
                  <p className="text-[10px] text-muted-foreground break-all mt-1">
                    Current: {formData.hero_video_url}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users size={16} /> Instructors
                </Label>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-secondary/10 max-h-[200px] overflow-y-auto">
                  {instructors?.map((instructor) => (
                    <div key={instructor.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`inst-${instructor.id}`}
                        checked={formData.instructor_ids.includes(instructor.id)}
                        onCheckedChange={() => toggleInstructor(instructor.id)}
                      />
                      <label
                        htmlFor={`inst-${instructor.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {instructor.user.first_name} {instructor.user.last_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="active" checked={formData.is_active} onCheckedChange={checked => setFormData({ ...formData, is_active: checked })} />
                <Label htmlFor="active">Is Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending || videoUploading || iconUploading}>
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Curriculum Dialog */}
        <Dialog open={isCurriculumOpen} onOpenChange={setIsCurriculumOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Curriculum: {curriculumCourse ? getLocalizedContent(curriculumCourse.title) : ""}</DialogTitle>
            </DialogHeader>

            {isCurriculumLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading curriculum...</div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    <BookOpen size={18} className="text-primary" /> Chapters
                  </h3>
                  <Button size="sm" variant="outline" className="gap-2" onClick={handleAddChapter}>
                    <Plus size={14} /> Add Chapter
                  </Button>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-4">
                  {curriculumData?.curriculum?.map((item: any, i: number) => (
                    <AccordionItem key={item.chapter.id} value={`chap-${item.chapter.id}`} className="border rounded-xl px-4 bg-secondary/10">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-white">{item.chapter.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="pl-9 space-y-4">
                          <div className="flex justify-between items-center text-xs mb-2">
                            <span>{item.lessons.length} Lessons</span>
                            <div className="flex gap-2">
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={() => handleEditChapter(item.chapter)}>
                                <Edit2 size={12} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-[var(--danger)]" onClick={() => {
                                if (confirm("Delete chapter and all its lessons?")) deleteChapterMutation.mutate(item.chapter.id);
                              }}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 border-l-2 border-primary/20 pl-4">
                            {item.lessons?.map((lesson: any, li: number) => (
                              <div key={lesson.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border group">
                                <span className="text-sm text-foreground">{li + 1}. {lesson.title}</span>
                                <div className="flex gap-1 text-primary">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={() => handleEditLesson(lesson)}>
                                    <Edit2 size={12} />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-[var(--danger)]" onClick={() => {
                                    if (confirm("Delete this lesson?")) deleteLessonMutation.mutate(lesson.id);
                                  }}>
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full border-dashed border border-gray-dark text-xs gap-2 text-black"
                              onClick={() => handleAddLesson(item.chapter.id, item.lessons?.length || 0)}
                            >
                              <Plus size={12} /> Add Lesson
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
            <DialogFooter>
              <Button  onClick={() => setIsCurriculumOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chapter Form Dialog */}
        <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChapter ? "Edit Chapter" : "Add Chapter"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="chap-title">Chapter Title</Label>
                <Input id="chap-title" value={chapterFormData.title} onChange={e => setChapterFormData({ ...chapterFormData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chap-order">Order Index</Label>
                <Input id="chap-order" type="number" value={chapterFormData.order_index} onChange={e => setChapterFormData({ ...chapterFormData, order_index: parseInt(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChapterOpen(false)}>Cancel</Button>
              <Button onClick={() => chapterMutation.mutate(chapterFormData)} disabled={chapterMutation.isPending}>
                {chapterMutation.isPending ? "Saving..." : "Save Chapter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lesson Form Dialog */}
        <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">Lesson Title</Label>
                <Input id="lesson-title" value={lessonFormData.title} onChange={e => setLessonFormData({ ...lessonFormData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-order">Order Index</Label>
                <Input id="lesson-order" type="number" value={lessonFormData.order_index} onChange={e => setLessonFormData({ ...lessonFormData, order_index: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-3">
                <Label>Materials (links)</Label>
                <p className="text-xs text-muted-foreground">
                  Add lesson materials such as Google Colab, YouTube, Google Drive, or presentation links.
                </p>
                <div className="space-y-2">
                  {lessonFormData.materials.map((material, index) => {
                    const showSourceWarning =
                      material.url.trim().length > 0 &&
                      !isSupportedMaterialSource(material.url.trim());

                    return (
                      <div key={index} className="flex flex-col gap-1 rounded-lg border border-border p-3 bg-secondary/10">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Label (optional, e.g. Colab Notebook)"
                            value={material.name}
                            onChange={(e) => handleMaterialChange(index, "name", e.target.value)}
                            className="text-xs"
                          />
                          <Input
                            placeholder="https://..."
                            type="url"
                            value={material.url}
                            onChange={(e) => handleMaterialChange(index, "url", e.target.value)}
                            className="text-xs"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveMaterialRow(index)}
                            disabled={lessonFormData.materials.length === 1}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        {showSourceWarning && (
                          <p className="text-[10px] text-amber-400">
                            This URL is not from a typical source (Colab, YouTube, Drive). Please double-check it.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs gap-2"
                  onClick={handleAddMaterialRow}
                >
                  <Plus size={12} /> Add another material
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLessonOpen(false)}>Cancel</Button>
              <Button onClick={() => lessonMutation.mutate(lessonFormData)} disabled={lessonMutation.isPending}>
                {lessonMutation.isPending ? "Saving..." : "Save Lesson"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCourses.map((course) => (
          <div key={course.id} className="bg-background rounded-xl border border-border overflow-hidden shadow-sm hover:border-primary/40 transition-all group">
            <div className="aspect-video bg-secondary/50 relative">
              <div className="absolute inset-0 flex items-center justify-center text-primary/20">
                {course.icon_url ? (
                  <img src={getMediaUrl(course.icon_url)} alt={getLocalizedContent(course.title)} className="w-1/2 h-auto max-w-full" />
                ) : (
                  <Globe size={64} />
                )}
              </div>
              <div className="absolute top-4 right-4 flex gap-2 transition-opacity">
                
                <Button size="icon" variant="secondary" className="h-8 w-8 bg-teal" onClick={() => handleEdit(course)}>
                  <Edit2 size={14} />
                </Button>
                
                <Button size="icon" variant="secondary" className="h-8 w-8 bg-danger" onClick={() => { if (confirm("Are you sure?")) deleteMutation.mutate(course.id);}}>
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                Order: {course.order_index || 0}
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  {getLocalizedContent(course.title)}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter ${course.is_active ? 'bg-green-500/10 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                  {course.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {getLocalizedContent(course.description)}
              </p>

              <div className="flex items-center justify-between text-xs font-medium mb-4">
                <span className="text-foreground">{course.duration_months} months</span>
                <span className="text-primary">{course.monthly_payment.toLocaleString()} AMD</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={() => handleManageCurriculum(course)}
              >
                <BookOpen size={14} />
                Manage Curriculum
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCourses;
