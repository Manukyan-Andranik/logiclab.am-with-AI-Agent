import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Signal, Brain, Code, BarChart3, Globe, Calculator, Box, Camera, Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCourses } from "@/api/courses";
import { getLocalizedContent } from "@/lib/localization";
import Card from "./ui/Card"
import Button from "./ui/Button";
import Loader from "./ui/Loader";
import { User } from "lucide-react";
import { getMediaUrl } from "@/api/client";

const iconMap: Record<string, any> = {
  brain: Brain,
  code: Code,
  "bar-chart": BarChart3,
  globe: Globe,
  calculator: Calculator,
  box: Box,
  camera: Camera,
  database: Database,
};

const CoursesSection = () => {
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses(true),
  });

  if (isLoading || !coursesData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader size={48} />
      </div>
    );
  }

  const courses = Array.isArray(coursesData) ? coursesData : [];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-16"
      >
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[var(--primary-alt)] uppercase tracking-tighter">
          Պահանջված <span className="text-[var(--white)]">Ուղղություններ</span>
        </h2>
      </motion.div>


      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {coursesData.map((course, i) => {
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
                to={`/courses/${course.id}`}
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

      {/* BUTTON (keep normal width) */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center mt-20"
      >
        <Link to="/courses">
          <Button className="px-6 py-3 rounded-xl bg-[var(--primary-alt)] hover:bg-[#FFD700] text-[#222] text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
            Դիտել բոլորը
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default CoursesSection;