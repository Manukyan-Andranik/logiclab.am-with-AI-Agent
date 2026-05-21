import { useQuery } from "@tanstack/react-query";
import { getInstructors } from "@/api/instructors";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { FaLinkedinIn, FaEnvelope, FaGithub, FaGlobe } from "react-icons/fa";
import { getMediaUrl } from "@/api/client";
import { Instructor } from "@/api/types";
import { useT, useLocalized } from "@/i18n";

const InstructorCard = ({ instructor, index }: { instructor: Instructor; index: number }) => {
  const t = useT();
  const tx = useLocalized();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group relative"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-card border border-border transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/5">
        {/* Image */}
        {instructor.user.profile_image ? (
          <img
            src={getMediaUrl(instructor.user.profile_image)}
            alt={`${tx(instructor.user.first_name)} ${tx(instructor.user.last_name)}`}
            className="h-full w-full object-cover transition-transform duration-700 scale-[1.01] group-hover:scale-105 grayscale-[0.2] group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card">
            <User className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}

        {/* Overlay Scrim — Premium depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        {/* Content on Image */}
        <div className="absolute inset-x-0 bottom-0 p-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
          
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
              {instructor.proficiency?.[0] ||
                instructor.skills?.[0] ||
                t('home.instructor_default_role')}
            </p>

            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none mb-1">
              {tx(instructor.user.first_name)} <br />
              <span className="text-foreground/80 font-medium italic">
                {tx(instructor.user.last_name)}
              </span>
            </h3>
          </div>

          {/* Hidden social reveal on hover */}
          <div className="flex gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
            {instructor.user.social_links?.linkedin && (
              <a
                href={instructor.user.social_links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                title="LinkedIn"
              >
                <FaLinkedinIn className="w-4 h-4" />
              </a>
            )}
            {instructor.user.social_links?.github && (
              <a
                href={instructor.user.social_links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                title="GitHub"
              >
                <FaGithub className="w-4 h-4" />
              </a>
            )}
            {instructor.user.social_links?.website && (
              <a
                href={instructor.user.social_links.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                title="Website"
              >
                <FaGlobe className="w-4 h-4" />
              </a>
            )}
            <a
              href={`mailto:${instructor.user.email}`}
              className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
              title="Email"
            >
              <FaEnvelope className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Info Below — Refined Typography */}
      <div className="mt-6 px-2">
        <p className="text-sm text-muted-foreground font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity duration-500">
          {tx(instructor.bio) || t('home.instructor_default_bio')}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {instructor.skills?.slice(0, 3).map((skill: string) => (
            <span
              key={skill}
              className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 border border-border px-2.5 py-1 rounded-full group-hover:border-primary/20 group-hover:text-primary/70 transition-colors"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const InstructorsSection = () => {
  const t = useT();
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: getInstructors,
  });

  if (isLoading) {
    return (
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="h-12 w-64 bg-card rounded-xl mb-16 animate-pulse" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] bg-card rounded-3xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!instructors || instructors.length === 0) return null;

  return (
    <section id="instructors" className="py-24 sm:py-32 lg:py-40 bg-background overflow-hidden relative">
      {/* Decorative element */}
      <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <span className="inline-flex items-center gap-2.5 text-primary font-mono font-bold text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-4">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t('home.instructors_eyebrow')}
          </span>
          <h2 className="text-h1 uppercase leading-[0.9]">
            {t('home.instructors_heading_a')} <span className="text-primary italic">{t('home.instructors_heading_b')}</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {instructors.map((instructor, i) => (
            <InstructorCard
              key={instructor.id}
              instructor={instructor}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstructorsSection;