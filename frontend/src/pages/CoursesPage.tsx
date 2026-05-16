import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Brain, 
  Code, 
  BarChart3, 
  Globe, 
  Calculator, 
  Box, 
  Camera, 
  Database, 
  LucideIcon,
  Sparkles
} from "lucide-react";
import VideoHero from "@/components/VideoHero";
import { useQuery } from "@tanstack/react-query";
import { getCourses } from "@/api/courses";
import { getLocalizedContent } from "@/lib/localization";
import { getMediaUrl } from "@/api/client";

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

const coursesVideo = "https://res.cloudinary.com/dujmbcltl/video/upload/v1772482244/hero-video_mqafze.mp4"

const CoursesPage = () => {
  const { hash } = useLocation();
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses(true),
  });

  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector<HTMLElement>(hash);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [hash]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-primary"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary font-display font-bold text-xs">
            LOGIC
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-black selection:bg-primary selection:text-black">
      <VideoHero
        videoSrc={coursesVideo}
        titleHighlight={"ԿԵՐՏԻ՛Ր"}
        title={"ՔՈ ԱՊԱԳԱՆ"}
        subtitle={"Տիրապետիր ամենապահանջված հմտություններին և դարձիր գլոբալ շուկայի մրցունակ մասնագետ Logic Lab-ի հետ:"}
      />

      {/* Courses Section */}
      <section id="all" className="py-24 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary opacity-[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-alt opacity-[0.03] blur-[120px] rounded-full" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="max-w-2xl">
              <h2 className="text-[var(--primary-alt)] font-display text-4xl sm:text-5xl lg:text-6xl font-black  uppercase tracking-tighter leading-none">
                ԲՈԼՈՐ <br />
                <span className="text-foreground">
                  ԴԱՍԸՆԹԱՑՆԵՐԸ
                </span>
              </h2>
            </div>
            
            <p className="text-[var(--gray-light)] font-medium max-w-xs border-l-2 border-primary pl-6 py-2 opacity-80">
              Մենք ստեղծում ենք միջավայր, որտեղ տեսությունը վերածվում է իրական փորձի:
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {(courses ?? []).map((course, i) => {
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
                        {course.duration_months} ամիս
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-black mb-4 text-[var(--white)] group-hover:text-[var(--primary-alt)] transition-colors uppercase tracking-tighter">
                      {getLocalizedContent(course.title)}
                    </h3>

                    <p className="text-sm text-[var(--gray-light)] opacity-60 leading-relaxed mb-8 line-clamp-3 font-medium">
                      {getLocalizedContent(course.description)}
                    </p>

                    <div className="flex items-center gap-3 text-xs font-black text-[var(--primary)] uppercase tracking-widest group-hover:gap-5 transition-all mt-auto border-t-2 border-[var(--gray-dark)] pt-6">
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

export default CoursesPage;