import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { getStudentDashboard, markChapterAccessed, EnrolledCourse } from "@/api/students";
import { listStudentExams } from "@/api/exams";
import { StudentExamsDashboardCard } from "@/components/exam/StudentExamsList";
import Loader from "@/components/ui/Loader";
import { getMediaUrl } from "@/api/client";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  User,
  ExternalLink,
  ChevronDown,
  Layers,
  PlayCircle,
  Award,
  BookMarked,
  MessageCircle,
  BookOpen,
  FolderPlus,
  Download,
} from "lucide-react";
import { useT, useLocalized } from "@/i18n";
import { motion, AnimatePresence } from "framer-motion";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const t = useT();
  const localized = useLocalized();
  const { pathname } = useLocation();
  const isMaterialsPage = pathname.startsWith("/student/materials");
  const queryClient = useQueryClient();
  const [openChapter, setOpenChapter] = useState<number | null>(null);

  const isAuthed = useMemo(() => {
    const t = localStorage.getItem("token");
    const r = localStorage.getItem("role");
    return !!t && r === "student";
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["studentDashboard"],
    queryFn: getStudentDashboard,
    enabled: isAuthed,
    retry: 1,
  });

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ["student-exams"],
    queryFn: () => listStudentExams(),
    enabled: isAuthed && !isMaterialsPage,
  });

  const markAccessedMutation = useMutation({
    mutationFn: markChapterAccessed,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studentDashboard"] }),
  });

  const totalStats = useMemo(() => {
    if (!data?.courses) return { totalLessons: 0, totalChapters: 0, accessedLessons: 0, courseCount: 0 };
    return {
      totalLessons: data.courses.reduce((s, c) => s + (c.progress?.total_lessons ?? 0), 0),
      totalChapters: data.courses.reduce((s, c) => s + (c.progress?.total_chapters ?? 0), 0),
      accessedLessons: data.courses.reduce((s, c) => s + (c.progress?.accessed_lessons ?? 0), 0),
      courseCount: data.courses.length,
    };
  }, [data?.courses]);

  if (!isAuthed) {
    return <Navigate to="/login?role=student" replace />;
  }

  const handleToggleChapter = (chapterId: number, isAccessed: boolean) => {
    setOpenChapter(openChapter === chapterId ? null : chapterId);
    if (openChapter !== chapterId && !isAccessed) markAccessedMutation.mutate(chapterId);
  };

  const getResourceLabel = (url: string, name: string) => {
    if (name && name !== "link" && name !== "") return name;
    const l = url.toLowerCase();
    if (l.includes("youtube") || l.includes("vimeo") || l.includes(".mp4")) return "Video";
    if (l.includes("colab")) return "Colab";
    if (l.includes("github")) return "GitHub";
    if (l.includes("pdf")) return "PDF";
    return "Link";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size={36} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-[1.25rem] p-10 max-w-[360px] w-full text-center">
          <div className="w-[52px] h-[52px] rounded-full accent-soft-bg border border-[hsl(var(--accent)/0.2)] flex items-center justify-center mx-auto mb-4">
            <User size={22} className="text-primary" />
          </div>
          <h2 className="text-foreground text-base font-semibold mb-2">{t("student_dashboard.error_title")}</h2>
          <p className="text-muted-foreground text-[0.8125rem] leading-relaxed mb-6">
            {t("student_dashboard.error_body")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/login?role=student")}
            className="w-full h-11 bg-primary text-primary-foreground border-0 rounded-xl text-sm font-bold cursor-pointer"
          >
            {t("student_dashboard.error_cta")}
          </button>
        </div>
      </div>
    );
  }

  const { student, courses } = data;
  const avatarSrc = student?.user?.profile_image ? getMediaUrl(student.user.profile_image) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1040px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-[60px] h-[60px] rounded-full object-cover border-[2.5px] border-primary"
                />
              ) : (
                <div className="w-[60px] h-[60px] rounded-full accent-soft-bg border-[2.5px] border-primary flex items-center justify-center">
                  <User size={28} className="text-primary" />
                </div>
              )}
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[hsl(var(--success))] border-[2.5px] border-background" />
            </div>
            <div>
              <p className="text-foreground text-base font-bold m-0 leading-tight">
                {localized(student.user.first_name)} {localized(student.user.last_name)}
              </p>
              <p className="text-[hsl(var(--text-muted))] text-xs m-0 font-medium">{t("student_dashboard.role_student")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1040px] mx-auto pt-8 px-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-foreground text-[1.875rem] font-bold m-0 mb-1 tracking-tight">
            {t("student_dashboard.welcome", { name: "" }).replace(/[,\s]*$/, ",")}{" "}
            <span className="text-primary">{localized(student.user.first_name)}</span>
          </h1>
        </motion.div>

        {!isMaterialsPage && (
          <motion.div
            className="sd-stats-grid"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            {[
              { icon: <Layers size={16} />, label: t("student_dashboard.stat_lessons"), value: String(totalStats.totalLessons) },
              { icon: <PlayCircle size={16} />, label: t("student_dashboard.stat_chapters"), value: String(totalStats.totalChapters) },
              { icon: <CheckCircle size={16} />, label: t("student_dashboard.stat_completed"), value: `${totalStats.accessedLessons}/${totalStats.totalLessons}` },
              { icon: <BookOpen size={16} />, label: t("student_dashboard.stat_courses"), value: String(totalStats.courseCount) },
            ].map((s, i) => (
              <motion.div key={i} className="bg-card border border-border rounded-[1.25rem] p-5">
                <div className="w-9 h-9 rounded-[0.625rem] accent-soft-bg border border-[hsl(var(--accent)/0.2)] flex items-center justify-center text-primary mb-3">
                  {s.icon}
                </div>
                <p className="text-foreground text-xl font-extrabold m-0 mb-0.5">{s.value}</p>
                <p className="text-[hsl(var(--text-muted))] text-[0.7rem] font-semibold uppercase m-0">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="sd-dash-grid">
          <div className="flex flex-col gap-5">
            {!isMaterialsPage &&
              (courses.length === 0 ? (
                <div className="bg-card border border-border rounded-[1.25rem] p-8 text-center text-muted-foreground">
                  {t("student_dashboard.no_course")}
                </div>
              ) : (
                courses.map((enrolled: EnrolledCourse, courseIdx: number) => (
                  <motion.div
                    key={enrolled.course_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.13 + courseIdx * 0.07 }}
                  >
                    <div className="relative rounded-[2.5rem] overflow-hidden">
                      <button
                        type="button"
                        className="sd-course-btn text-left bg-card border border-border p-10 rounded-[2.5rem] shadow-[var(--shadow-lg)] cursor-pointer w-full"
                        onClick={() => navigate("/student/materials")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") navigate(`/student/materials/${enrolled.course_id}`);
                        }}
                        aria-label={`Open materials for ${localized(enrolled.course.title)}`}
                      >
                        <div
                          className="absolute top-0 right-0 w-64 h-64 accent-soft-bg rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"
                          aria-hidden
                        />
                        <div className="relative flex flex-col gap-6">
                          <div className="flex items-center gap-3">
                            <div className="accent-soft-bg text-primary border border-[hsl(var(--accent)/0.2)] text-[10px] uppercase font-black px-3 py-1 rounded">
                              {t("student_dashboard.current_course_tag")}
                            </div>
                          </div>
                          <h2 className="text-foreground text-[clamp(1.75rem,5vw,2.5rem)] font-black uppercase italic m-0">
                            {localized(enrolled.course.title)}
                          </h2>
                          <div className="flex flex-wrap gap-5 text-[0.8rem] font-bold italic text-muted-foreground uppercase">
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} className="text-primary shrink-0" />
                              {t("student_dashboard.duration", { months: enrolled.course.duration_months || 0 })}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BookMarked size={14} className="text-primary shrink-0" />
                              {t("student_dashboard.chapter_count", { count: enrolled.materials.length })}
                            </div>
                            {enrolled.is_completed ? (
                              <div className="flex items-center gap-1.5 text-primary">
                                <Award size={14} className="shrink-0" />
                                {t("student_dashboard.graduated")}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Award size={14} className="text-primary shrink-0" />
                                {t("student_dashboard.certificate")}
                              </div>
                            )}
                          </div>
                          <div className="pt-4 max-w-[400px] w-full flex flex-col gap-3">
                            <div className="flex justify-between">
                              <span className="text-[11px] font-black uppercase text-foreground/40">
                                {t("student_dashboard.progress")}
                              </span>
                              <span className="text-[1.1rem] font-black text-primary italic">
                                {enrolled.progress.percentage}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${enrolled.progress.percentage}%` }}
                                transition={{ duration: 1, delay: 0.2 + courseIdx * 0.1 }}
                                className="h-full bg-primary"
                              />
                            </div>
                            {enrolled.is_completed && enrolled.certificate_url && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(enrolled.certificate_url!, "_blank");
                                }}
                                className="mt-2 w-full h-9 accent-soft-bg border border-[hsl(var(--accent)/0.2)] text-primary rounded-lg text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Download size={14} />
                                {t("student_dashboard.download_certificate")}
                              </button>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                ))
              ))}

            {!isMaterialsPage && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="mb-5">
                <StudentExamsDashboardCard exams={examsData} isLoading={examsLoading} />
              </motion.div>
            )}

            {isMaterialsPage && (
              <div>
                {courses.length === 0 ? (
                  <div className="bg-card border border-border rounded-[1.25rem] p-8 text-center text-muted-foreground">
                    {t("student_dashboard.materials_empty")}
                  </div>
                ) : (
                  courses.map((enrolled: EnrolledCourse, courseIdx: number) => (
                    <div key={enrolled.course_id} className={cn(courseIdx < courses.length - 1 && "mb-10")}>
                      <div className="flex items-center gap-2 mb-5">
                        <BookMarked size={15} className="text-primary shrink-0" />
                        <h2
                          className={cn(
                            "text-base font-bold m-0",
                            courses.length > 1 ? "text-primary" : "text-foreground",
                          )}
                        >
                          {courses.length > 1 ? localized(enrolled.course.title) : t("student_dashboard.materials_section")}
                        </h2>
                        {courses.length > 1 && (
                          <span className="text-[hsl(var(--text-muted))] text-xs font-medium">
                            — {t("student_dashboard.materials_section_for_course", { count: enrolled.materials.length })}
                          </span>
                        )}
                      </div>

                      {enrolled.materials.length === 0 ? (
                        <div className="bg-card border border-border rounded-2xl p-6 text-[hsl(var(--text-muted))] text-sm italic">
                          {t("student_dashboard.materials_empty")}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {enrolled.materials.map((chapter, idx) => (
                            <motion.div
                              key={chapter.chapter_id}
                              className={cn(
                                "bg-card border rounded-[1.125rem] overflow-hidden",
                                openChapter === chapter.chapter_id
                                  ? "border-[hsl(var(--accent)/0.2)]"
                                  : "border-border",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleChapter(chapter.chapter_id, chapter.is_accessed)}
                                className="w-full flex items-center gap-3.5 py-4 px-5 bg-transparent border-0 cursor-pointer text-left"
                              >
                                <div
                                  className={cn(
                                    "shrink-0 w-9 h-9 rounded-[0.625rem] flex items-center justify-center border",
                                    chapter.is_accessed
                                      ? "bg-primary border-primary"
                                      : "accent-soft-bg border-[hsl(var(--accent)/0.2)]",
                                  )}
                                >
                                  {chapter.is_accessed ? (
                                    <CheckCircle size={16} className="text-primary-foreground" strokeWidth={2.5} />
                                  ) : (
                                    <span className="text-[0.6875rem] font-bold text-primary">
                                      {(idx + 1).toString().padStart(2, "0")}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-foreground text-sm font-semibold m-0 truncate">{chapter.chapter_title}</p>
                                  <p className="text-[hsl(var(--text-muted))] text-xs m-0">
                                    {t("student_dashboard.chapter_lessons_count", { count: chapter.lessons.length })}
                                  </p>
                                </div>
                                <ChevronDown
                                  size={15}
                                  className={cn(
                                    "text-[hsl(var(--text-muted))] transition-transform duration-250 shrink-0",
                                    openChapter === chapter.chapter_id && "rotate-180",
                                  )}
                                />
                              </button>
                              <AnimatePresence>
                                {openChapter === chapter.chapter_id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="border-t border-border/60 py-2">
                                      {chapter.lessons.map((lesson, lIdx) => (
                                        <div key={lesson.lesson_id} className="py-3 px-5 flex flex-col gap-2">
                                          <div className="flex gap-3">
                                            <span className="text-[0.7rem] font-semibold text-[hsl(var(--text-muted))]">
                                              {(lIdx + 1).toString().padStart(2, "0")}
                                            </span>
                                            <span className="text-muted-foreground text-[0.8rem]">{lesson.lesson_title}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-2 pl-6">
                                            {lesson.resource_links.map((link, linkIdx) => (
                                              <a
                                                key={linkIdx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 py-1.5 px-2.5 accent-soft-bg border border-[hsl(var(--accent)/0.2)] rounded-lg text-primary text-[0.65rem] font-bold no-underline"
                                              >
                                                {getResourceLabel(link.url, link.name)} <ExternalLink size={9} />
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-[1.25rem] p-6"
            >
              <div className="w-10 h-10 rounded-xl accent-soft-bg border border-[hsl(var(--accent)/0.2)] flex items-center justify-center mb-4 text-primary">
                <FolderPlus size={20} />
              </div>
              <h3 className="text-foreground text-base font-extrabold m-0 mb-2">{t("student_dashboard.projects_card_title")}</h3>
              <p className="text-muted-foreground text-[0.8rem] font-medium leading-normal mb-5">
                {t("student_dashboard.projects_card_body")}
              </p>
              <button
                type="button"
                onClick={() => navigate("/student/projects")}
                className="w-full h-11 bg-primary text-primary-foreground border-0 rounded-xl text-[0.85rem] font-extrabold cursor-pointer"
              >
                {t("student_dashboard.projects_card_cta")}
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-primary rounded-[1.25rem] p-6">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--surface-1)/0.1)] flex items-center justify-center mb-4">
                <MessageCircle size={20} className="text-primary-foreground" />
              </div>
              <h3 className="text-primary-foreground text-base font-extrabold m-0 mb-2">{t("student_dashboard.help_title")}</h3>
              <p className="text-primary-foreground/70 text-[0.8rem] font-semibold leading-snug mb-5">
                {t("student_dashboard.help_body")}
              </p>
              <button
                type="button"
                onClick={() => navigate("/#contact")}
                className="w-full h-11 bg-background text-primary border-0 rounded-xl text-[0.85rem] font-extrabold cursor-pointer"
              >
                {t("student_dashboard.help_cta")}
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
