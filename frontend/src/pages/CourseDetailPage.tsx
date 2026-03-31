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
import { getLocalizedContent } from "@/lib/localization";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const { id } = useParams<{ id: string }>();
  const idOrSlug = id || "0";

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ["course", idOrSlug],
    queryFn: () => getCourse(idOrSlug),
    enabled: !!idOrSlug,
  });

  const { data: curriculumData } = useQuery({
    queryKey: ["curriculum", idOrSlug],
    queryFn: () => getCourseCurriculum(idOrSlug),
    enabled: !!idOrSlug,
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
            Դասընթացը չի գտնվել
          </h1>
          <Link to="/courses" className="text-primary hover:underline">
            Վերադառնալ դասընթացներին
          </Link>
        </div>
      </div>
    );
  }

  const otherCourses = allCourses?.filter((c) => c.id !== course.id).slice(0, 3) || [];
  const curriculum = curriculumData?.curriculum || [];

  return (
    <div className="min-h-screen bg-black">

      <VideoHero
        videoSrc={course.hero_video_url}
        title={getLocalizedContent(course.title)}>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black border-2 border-primary-alt text-primary-alt text-sm font-black uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            {course.duration_months} ամիս
          </span>
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black border-2 border-primary text-primary text-sm font-black uppercase tracking-widest">
            <Signal className="w-4 h-4" />
            {course.level || "Բոլոր"}
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
            Բոլոր դասընթացները
          </Link>

          <div className="grid lg:grid-cols-3 gap-16">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-24">
              {/* About */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-display text-4xl font-black text-white mb-8 uppercase tracking-tighter">
                  Դասընթացի <span className="text-primary">մասին</span>
                </h2>
                <p className="text-[var(--gray-light)] opacity-80 text-lg leading-relaxed font-medium whitespace-pre-wrap">
                  {getLocalizedContent(course.description)}
                </p>
              </motion.div>

              {/* Curriculum */}
              {curriculum.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}>
                  <h2 className="font-display text-4xl font-black text-white mb-12 uppercase tracking-tighter">
                    ԴԱՍԸՆԹԱՑԻ <span className="text-primary-alt">ԾՐԱԳԻՐԸ</span>
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
                  <h2 className="font-display text-4xl font-black text-white mb-12 uppercase tracking-tighter">
                    ԴԱՍԱԽՈՍՆԵՐ
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-10">
                    {course.instructors.map((instructor) => (
                      <div key={instructor.id} className="flex flex-col gap-6 p-10 rounded-3xl bg-gray-dark border-2 border-black hover:border-primary transition-all">
                        <div className="flex items-center gap-6">
                          <Avatar className="w-20 h-20 border-4 border-black shadow-2xl">
                            <AvatarImage src={instructor.user.profile_image} alt={instructor.user.first_name} />
                            <AvatarFallback className="bg-primary text-black font-black">{instructor.user.first_name[0]}{instructor.user.last_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-black text-xl text-white uppercase tracking-tighter">
                              {instructor.user.first_name} {instructor.user.last_name}
                            </h3>
                            <p className="text-[10px] text-primary-alt font-black uppercase tracking-[0.2em] mt-1">Դասախոս</p>
                          </div>
                        </div>
                        {instructor.bio && (
                          <p className="text-sm text-[var(--gray-light)] opacity-60 leading-relaxed font-medium">
                            {instructor.bio}
                          </p>
                        )}
                        {instructor.skills && instructor.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {instructor.skills.map((skill) => (
                              <span key={skill} className="px-3 py-1.5 rounded-lg bg-black text-white text-[10px] font-black uppercase tracking-widest border border-gray-dark">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
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
                  <h3 className="font-display text-2xl font-black text-white uppercase tracking-tighter">
                    Մանրամասներ
                  </h3>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-primary shadow-inner">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest">Տևողությունը</p>
                      <p className="text-lg text-primary-alt font-black">{course.duration_months} ամիս</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-inner">
                      <Signal size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest">Մակարդակ</p>
                      <p className="text-lg text-primary-alt font-black">{course.level || "Բոլոր"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-primary shadow-inner">
                      <Laptop size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest">Ֆորմատ</p>
                      <p className="text-lg text-primary-alt font-black">Առցանց / Առկա</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-6 pt-10 border-t-4 border-black">
                  <div>
                    <p className="text-[10px] text-white opacity-90 font-black uppercase tracking-widest mb-2">Ամսական վճար</p>
                    <p className="text-4xl font-black text-white tracking-tighter">{course.monthly_payment.toLocaleString()} <span className="text-sm font-bold opacity-90">AMD</span></p>
                  </div>
                  <Link
                    to={`/register?course=${course.id}`}
                    className="block w-full bg-primary-alt text-black py-6 rounded-2xl font-black text-base text-center uppercase tracking-[0.2em] hover:bg-primary-alt hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    Գրանցվել
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Other Courses */}
      <section className="py-24 bg-gray-dark">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="font-display text-4xl font-black text-white uppercase tracking-tighter">
              ԱՅԼ <span className="text-primary-alt">ԴԱՍԸՆԹԱՑՆԵՐ</span>
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
                    to={`/courses/${course.slug || course.id}`}
                    className="glass-card rounded-3xl p-8 border-2 border-black hover:border-primary-alt transition-all duration-300 group block h-full bg-black"
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-gray-dark flex items-center justify-center group-hover:bg-primary transition-colors text-primary group-hover:text-black">
                        {course.icon_url ? (
                          <img src={course.icon_url} alt="" className="w-15 h-15" />
                        ) : (
                          <Icon className="w-7 h-7" />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-primary-alt bg-gray-dark px-4 py-2 rounded-full uppercase tracking-[0.2em]">
                        {course.duration_months} ամիս
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-black mb-4 text-white group-hover:text-primary-alt transition-colors uppercase tracking-tighter">
                      {getLocalizedContent(course.title)}
                    </h3>

                    <p className="text-sm text-[var(--gray-light)] opacity-60 leading-relaxed mb-8 line-clamp-3 font-medium">
                      {getLocalizedContent(course.description)}
                    </p>

                    <div className="flex items-center gap-3 text-xs font-black text-primary uppercase tracking-widest group-hover:gap-5 transition-all mt-auto border-t-2 border-gray-dark pt-6">
                      {"ծանոթանալ"}
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
