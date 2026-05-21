import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { getStudentDashboard, markChapterAccessed, EnrolledCourse } from "@/api/students";
import Loader from "@/components/ui/Loader";
import { getMediaUrl } from "@/api/client";
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
} from "lucide-react";
import { useT, useLocalized } from "@/i18n";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  bg: "#222222",
  surface: "#2a2a2a",
  border: "#333333",
  borderSubtle: "#2e2e2e",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#555555",
  gold: "#FFD700",
  goldBg: "rgba(255,215,0,0.08)",
  goldBorder: "rgba(255,215,0,0.20)",
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const t = useT();
  const localized = useLocalized();
  const { pathname } = useLocation();
  const isMaterialsPage = pathname === "/student/materials";
  const queryClient = useQueryClient();
  const [openChapter, setOpenChapter] = useState<number | null>(null);

  // Sync auth check (read once per render). Kept BEFORE the hooks list as a
  // memoized boolean so the hook order remains stable across re-renders —
  // returning early before useQuery violates Rules of Hooks if token/role
  // change between renders (e.g. login/logout in another tab), and React
  // can throw or silently re-mount the tree, triggering refetch loops.
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

  // Early return AFTER all hooks so call count stays stable across renders.
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
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size={36} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "1.25rem", padding: "2.5rem", maxWidth: 360, width: "100%", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <User size={22} color={C.gold} />
          </div>
          <h2 style={{ color: C.textPrimary, fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{t('student_dashboard.error_title')}</h2>
          <p style={{ color: C.textSecondary, fontSize: "0.8125rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {t('student_dashboard.error_body')}
          </p>
          <button
            onClick={() => navigate("/login?role=student")}
            style={{ width: "100%", height: 44, background: C.gold, color: C.bg, border: "none", borderRadius: "0.75rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
          >
            {t('student_dashboard.error_cta')}
          </button>
        </div>
      </div>
    );
  }

  const { student, courses } = data;
  const avatarSrc = student?.user?.profile_image ? getMediaUrl(student.user.profile_image) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "rgba(34,34,34,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 1.5rem", height: 80, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ position: "relative" }}>
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${C.gold}` }}
                />
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.goldBg, border: `2.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={28} color={C.gold} />
                </div>
              )}
              <span style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#4ade80", border: `2.5px solid ${C.bg}` }} />
            </div>
            <div>
              <p style={{ color: C.textPrimary, fontSize: "1rem", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {localized(student.user.first_name)} {localized(student.user.last_name)}
              </p>
              <p style={{ color: C.textMuted, fontSize: "0.75rem", margin: 0, fontWeight: 500 }}>{t('student_dashboard.role_student')}</p>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
        <style>{`
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.875rem;
            margin-bottom: 1.75rem;
          }
          @media(min-width: 768px) {
            .stats-grid { grid-template-columns: repeat(4, 1fr); }
            .dash-grid { grid-template-columns: 1fr 288px !important; }
          }
          .dash-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        `}</style>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
          <h1 style={{ color: C.textPrimary, fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.25rem", letterSpacing: "-0.025em" }}>
            {t('student_dashboard.welcome', { name: '' }).replace(/[,\s]*$/, ',')} <span style={{ color: C.gold }}>{localized(student.user.first_name)}</span>
          </h1>
        </motion.div>

        {!isMaterialsPage && (
          <motion.div className="stats-grid" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            {[
              { icon: <Layers size={16} />, label: t('student_dashboard.stat_lessons'), value: String(totalStats.totalLessons) },
              { icon: <PlayCircle size={16} />, label: t('student_dashboard.stat_chapters'), value: String(totalStats.totalChapters) },
              { icon: <CheckCircle size={16} />, label: t('student_dashboard.stat_completed'), value: `${totalStats.accessedLessons}/${totalStats.totalLessons}` },
              { icon: <BookOpen size={16} />, label: t('student_dashboard.stat_courses'), value: String(totalStats.courseCount) },
            ].map((s, i) => (
              <motion.div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "1.25rem", padding: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "0.625rem", background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, marginBottom: "0.75rem" }}>
                  {s.icon}
                </div>
                <p style={{ color: C.textPrimary, fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.125rem" }}>{s.value}</p>
                <p style={{ color: C.textMuted, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="dash-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Dashboard: per-course progress cards */}
            {!isMaterialsPage && (
              courses.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "1.25rem", padding: "2rem", textAlign: "center", color: C.textSecondary }}>
                  {t('student_dashboard.no_course')}
                </div>
              ) : (
                courses.map((enrolled: EnrolledCourse, courseIdx: number) => (
                  <motion.div
                    key={enrolled.course_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.13 + courseIdx * 0.07 }}
                    style={{
                      position: "relative", overflow: "hidden", borderRadius: "2.5rem",
                      background: C.surface, border: `1px solid ${C.border}`, padding: "2.5rem",
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <div style={{ position: "absolute", top: 0, right: 0, width: "256px", height: "256px", background: C.goldBg, borderRadius: "50%", filter: "blur(100px)", marginRight: "-128px", marginTop: "-128px", pointerEvents: "none" }} />
                    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ background: C.goldBg, color: C.gold, border: `1px solid ${C.goldBorder}`, fontSize: "10px", textTransform: "uppercase", fontWeight: 900, padding: "0.25rem 0.75rem", borderRadius: "4px" }}>
                          {t('student_dashboard.current_course_tag')}
                        </div>
                      </div>
                      <h2 style={{ color: C.textPrimary, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 900, textTransform: "uppercase", fontStyle: "italic", margin: 0 }}>
                        {localized(enrolled.course.title)}
                      </h2>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", fontSize: "0.8rem", fontWeight: 700, fontStyle: "italic", color: C.textSecondary, textTransform: "uppercase" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Clock size={14} color={C.gold} /> {t('student_dashboard.duration', { months: enrolled.course.duration_months || 0 })}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><BookMarked size={14} color={C.gold} /> {t('student_dashboard.chapter_count', { count: enrolled.materials.length })}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Award size={14} color={C.gold} /> {t('student_dashboard.certificate')}</div>
                      </div>
                      <div style={{ paddingTop: "1rem", maxWidth: "400px", width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{t('student_dashboard.progress')}</span>
                          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: C.gold, fontStyle: "italic" }}>{enrolled.progress.percentage}%</span>
                        </div>
                        <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${enrolled.progress.percentage}%` }} transition={{ duration: 1, delay: 0.2 + courseIdx * 0.1 }} style={{ height: "100%", background: C.gold }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )
            )}

            {/* Materials page: per-course sections */}
            {isMaterialsPage && (
              <div>
                {courses.length === 0 ? (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "1.25rem", padding: "2rem", textAlign: "center", color: C.textSecondary }}>
                    {t('student_dashboard.materials_empty')}
                  </div>
                ) : (
                  courses.map((enrolled: EnrolledCourse, courseIdx: number) => (
                    <div key={enrolled.course_id} style={{ marginBottom: courseIdx < courses.length - 1 ? "2.5rem" : 0 }}>
                      {/* Course section header */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                        <BookMarked size={15} color={C.gold} />
                        <h2 style={{ color: courses.length > 1 ? C.gold : C.textPrimary, fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                          {courses.length > 1 ? localized(enrolled.course.title) : t('student_dashboard.materials_section')}
                        </h2>
                        {courses.length > 1 && (
                          <span style={{ color: C.textMuted, fontSize: "0.75rem", fontWeight: 500 }}>
                            — {t('student_dashboard.materials_section_for_course', { count: enrolled.materials.length })}
                          </span>
                        )}
                      </div>

                      {enrolled.materials.length === 0 ? (
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "1rem", padding: "1.5rem", color: C.textMuted, fontSize: "0.875rem", fontStyle: "italic" }}>
                          {t('student_dashboard.materials_empty')}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                          {enrolled.materials.map((chapter, idx) => (
                            <motion.div key={chapter.chapter_id} style={{ background: C.surface, border: `1px solid ${openChapter === chapter.chapter_id ? C.goldBorder : C.border}`, borderRadius: "1.125rem", overflow: "hidden" }}>
                              <button onClick={() => handleToggleChapter(chapter.chapter_id, chapter.is_accessed)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.875rem", padding: "1rem 1.25rem", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "0.625rem", background: chapter.is_accessed ? C.gold : C.goldBg, border: `1px solid ${chapter.is_accessed ? C.gold : C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {chapter.is_accessed ? <CheckCircle size={16} color={C.bg} strokeWidth={2.5} /> : <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: C.gold }}>{(idx + 1).toString().padStart(2, "0")}</span>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ color: C.textPrimary, fontSize: "0.875rem", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chapter.chapter_title}</p>
                                  <p style={{ color: C.textMuted, fontSize: "0.75rem", margin: 0 }}>{t('student_dashboard.chapter_lessons_count', { count: chapter.lessons.length })}</p>
                                </div>
                                <ChevronDown size={15} color={C.textMuted} style={{ transition: "transform .25s", transform: openChapter === chapter.chapter_id ? "rotate(180deg)" : "none" }} />
                              </button>
                              <AnimatePresence>
                                {openChapter === chapter.chapter_id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                                    <div style={{ borderTop: `1px solid ${C.borderSubtle}`, padding: "0.5rem 0" }}>
                                      {chapter.lessons.map((lesson, lIdx) => (
                                        <div key={lesson.lesson_id} style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                          <div style={{ display: "flex", gap: "0.75rem" }}>
                                            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.textMuted }}>{(lIdx + 1).toString().padStart(2, "0")}</span>
                                            <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{lesson.lesson_title}</span>
                                          </div>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", paddingLeft: "1.5rem" }}>
                                            {lesson.resource_links.map((link, linkIdx) => (
                                              <a key={linkIdx} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.6rem", background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: "0.5rem", color: C.gold, fontSize: "0.65rem", fontWeight: 700, textDecoration: "none" }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "1.25rem", padding: "1.5rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", color: C.gold }}>
                <FolderPlus size={20} />
              </div>
              <h3 style={{ color: C.textPrimary, fontSize: "1rem", fontWeight: 800, margin: "0 0 0.5rem" }}>{t('student_dashboard.projects_card_title')}</h3>
              <p style={{ color: C.textSecondary, fontSize: "0.8rem", fontWeight: 500, lineHeight: 1.5, marginBottom: "1.25rem" }}>{t('student_dashboard.projects_card_body')}</p>
              <button onClick={() => navigate("/student/projects")} style={{ width: "100%", height: 44, background: C.gold, color: C.bg, border: "none", borderRadius: "0.75rem", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer" }}>{t('student_dashboard.projects_card_cta')}</button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ background: C.gold, borderRadius: "1.25rem", padding: "1.5rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <MessageCircle size={20} color={C.bg} />
              </div>
              <h3 style={{ color: C.bg, fontSize: "1rem", fontWeight: 800, margin: "0 0 0.5rem" }}>{t('student_dashboard.help_title')}</h3>
              <p style={{ color: "rgba(34,34,34,0.7)", fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.4, marginBottom: "1.25rem" }}>{t('student_dashboard.help_body')}</p>
              <button onClick={() => navigate("/#contact")} style={{ width: "100%", height: 44, background: C.bg, color: C.gold, border: "none", borderRadius: "0.75rem", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer" }}>{t('student_dashboard.help_cta')}</button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
