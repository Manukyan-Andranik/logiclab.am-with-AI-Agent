import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Clock, Signal, CheckCircle2, Wrench,
  BookOpen, Users, Award, ChevronRight, Brain, Code,
  BarChart3, Globe, Calculator, Box, Camera, Database, LucideIcon, Mail, Laptop
} from "lucide-react";
import VideoHero from "@/components/VideoHero";
import detailVideo from "@/assets/course-detail-video.mp4";
import { useQuery } from "@tanstack/react-query";
import { getCourse, getCourses, getCourseCurriculum } from "@/api/courses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getMediaUrl } from "@/api/client";
import { useT, useLocalized } from "@/i18n";

const iconMap: Record<string, LucideIcon> = {
  brain: Brain,
  code: Code,
  "bar-chart": BarChart3,
  globe: Globe,
  calculator: Calculator,
  box: Box,
  camera: Camera,
  database: Database,
};

const CourseDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const courseSlug = slug || "0";
  const t = useT();
  const tx = useLocalized();

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ["course", courseSlug],
    queryFn: () => getCourse(courseSlug),
    enabled: !!courseSlug,
  });

  const { data: curriculumData } = useQuery({
    queryKey: ["curriculum", courseSlug],
    queryFn: () => getCourseCurriculum(courseSlug),
    enabled: !!courseSlug,
  });

  const { data: allCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses(),
  });

  if (isCourseLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-white mb-4">
            {t("course_detail.not_found")}
          </h1>
          <Link to="/courses" className="text-primary hover:underline">
            {t("course_detail.back_to_courses")}
          </Link>
        </div>
      </div>
    );
  }

  const otherCourses = allCourses ? [...allCourses].filter((c) => c.id !== course.id).sort((a, b) => (b.order_index || 0) - (a.order_index || 0)).slice(0, 3) : [];
  const curriculum = curriculumData?.curriculum || [];

  return (
    <div className="min-h-screen bg-black">

      <VideoHero
        videoSrc={course.hero_video_url}
        title={tx(course.title)}>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black border-2 border-primary-alt text-primary-alt text-sm font-black uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            {t("course_detail.duration_value", { count: course.duration_months })}
          </span>
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black border-2 border-primary text-primary text-sm font-black uppercase tracking-widest">
            <Signal className="w-4 h-4" />
            {course.level || t("course_detail.level_default")}
          </span>
        </div>
      </VideoHero>

      {/* Main Content */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-primary-alt font-black text-xs uppercase tracking-widest hover:text-white transition-colors mb-16"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("course_detail.back_to_courses")}
          </Link>

          <div className="grid lg:grid-cols-3 gap-16">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-24">
              {/* About */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-display text-4xl font-black mb-8 uppercase tracking-tighter">
                  <span className="text-primary">{t("course_detail.about_a")}</span>{" "}
                  <span className="text-white">{t("course_detail.about_b")}</span>
                </h2>
                <p className="text-[var(--gray-light)] opacity-80 text-lg leading-relaxed font-medium whitespace-pre-wrap">
                  {tx(course.description)}
                </p>
              </motion.div>

              {/* Curriculum */}
              {curriculum.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}>
                  <h2 className="font-display text-4xl font-black text-white mb-12 uppercase tracking-tighter">
                    <span className="text-primary-alt">{t("course_detail.syllabus_title")}</span>
                  </h2>
                  <Accordion type="single" collapsible className="w-full space-y-6">
                    {curriculum.map((item: any, i: number) => (
                      <AccordionItem
                        key={item.chapter.id}
                        value={`chapter-${item.chapter.id}`}
                        className="border-2 border-gray-dark rounded-3xl px-8 bg-gray-dark"
                      >
                        <AccordionTrigger className="hover:no-underline py-8 group">
                          <div className="flex items-center gap-6 text-left">
                            <span className="w-12 h-12 rounded-2xl bg-primary text-black flex items-center justify-center text-lg font-black shrink-0 group-hover:bg-primary-alt transition-colors">
                              {i + 1}
                            </span>
                            <div>
                              <h3 className="font-black text-xl text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.chapter.title}</h3>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-8">
                          <ul className="space-y-4 ml-16">
                            {item.lessons.map((lesson: any) => (
                              <li key={lesson.id} className="flex items-start gap-4 group">
                                <div className="mt-2 w-2 h-2 rounded-full bg-primary-alt opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                                <div>
                                  <p className="text-base text-white font-bold">{lesson.title}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </motion.div>
              )}

              {/* Instructors */}
              {course.instructors && course.instructors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="font-display text-4xl font-black text-white mb-12 uppercase tracking-tighter italic">
                    {t("course_detail.instructors_title")}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-8">
                    {course.instructors.map((instructor) => (
                      <div key={instructor.id} className="group relative flex flex-col gap-4 p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all duration-500">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500 bg-gray-dark border border-white/10">
                            {instructor.user.profile_image ? (
                              <img src={getMediaUrl(instructor.user.profile_image)} alt={tx(instructor.user.first_name)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10">
                                <Users size={32} />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-black text-xl text-white uppercase tracking-tighter italic">
                              {tx(instructor.user.first_name)} <br /> {tx(instructor.user.last_name)}
                            </h3>
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">
                              {instructor.proficiency?.[0] || instructor.skills?.[0] || t("course_detail.default_proficiency")}
                            </p>
                          </div>
                        </div>
                        {instructor.bio && (
                          <p className="text-sm text-gray-light opacity-60 leading-relaxed italic group-hover:opacity-100 transition-opacity">
                            {tx(instructor.bio)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {instructor.skills?.slice(0, 3).map((skill) => (
                            <span key={skill} className="px-2 py-1 rounded bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest border border-white/5">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              {/* Tools Card */}
              <div className="glass-card rounded-[40px] p-10 sticky top-24 bg-gray-dark border-4 border-black shadow-2xl">
                {/* Schedule and Details */}
                <div className="space-y-8 mb-12">
                  <h3 className="text-[var(--primary-alt)] font-display text-2xl font-black uppercase tracking-tighter">
                    {t("course_detail.details_title")}
                  </h3>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-primary shadow-inner">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest">{t("course_detail.duration_label")}</p>
                      <p className="text-lg text-primary-alt font-black">{t("course_detail.duration_value", { count: course.duration_months })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-inner">
                      <Signal size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest">{t("course_detail.level_label")}</p>
                      <p className="text-lg text-primary-alt font-black">{course.level || t("course_detail.level_default")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-primary shadow-inner">
                      <Laptop size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest">{t("course_detail.format_label")}</p>
                      <p className="text-lg text-primary-alt font-black">{t("course_detail.format_value")}</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-6 pt-10 border-t-4 border-black">
                  <div>
                    <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest mb-2">{t("course_detail.monthly_label")}</p>
                    <p className="text-4xl font-black text-white tracking-tighter">{course.monthly_payment.toLocaleString()} <span className="text-sm font-bold opacity-90">{t("course_detail.currency")}</span></p>
                  </div>

                  <Link
                    to={`/register?course=${course.slug}`}
                    className="block w-full px-6 py-3 rounded-xl bg-[#FFC700] hover:bg-[#FFD000] text-[#222] text-sm font-black uppercase tracking-widest text-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                  >
                    {t("course_detail.enroll")}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Other Courses */}
      <section className="py-24 bg-gray">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="font-display text-4xl font-black text-white uppercase tracking-tighter">
              {t("course_detail.other_courses_a")} <span className="text-[var(--primary-alt)]">{t("course_detail.other_courses_b")}</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherCourses.map((course, i) => {
              const Icon = iconMap[course.icon_url || "brain"] || Brain;
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/courses/${course.slug}`}
                    className="glass-card rounded-3xl p-8 border-2 border-[var(--black)] hover:border-[var(--primary-alt)] transition-all duration-300 group block h-full bg-[var(--black)]"
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--gray-dark)] flex items-center justify-center group-hover:bg-[var(--primary)] transition-colors text-[var(--primary)] group-hover:text-[var(--black)]">
                        {course.icon_url ? (
                          <img src={getMediaUrl(course.icon_url)} alt="" className="w-15 h-15" />
                        ) : (
                          <Icon className="w-7 h-7" />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-[var(--primary-alt)] bg-[var(--gray-dark)] px-4 py-2 rounded-full uppercase tracking-[0.2em]">
                        {t("course_detail.duration_value", { count: course.duration_months })}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-black mb-4 text-[var(--white)] group-hover:text-[var(--primary-alt)] transition-colors uppercase tracking-tighter">
                      {tx(course.title)}
                    </h3>

                    <p className="text-sm text-[var(--gray-light)] opacity-60 leading-relaxed mb-8 line-clamp-3 font-medium">
                      {tx(course.description)}
                    </p>

                    <div className="flex items-center gap-3 text-xs font-black text-[var(--primary)] uppercase tracking-widest group-hover:gap-5 transition-all mt-auto border-t-2 border-[var(--gray-dark)] pt-6">
                      {t("courses.explore")}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseDetailPage;
