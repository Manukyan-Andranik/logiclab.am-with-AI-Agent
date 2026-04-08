import { useQuery } from "@tanstack/react-query";
import { getInstructors } from "@/api/instructors";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { getMediaUrl } from "@/api/client";

const InstructorCard = ({ instructor, index }: { instructor: any; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group relative"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-dark border border-white/5 transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:shadow-primary/5">
        {/* Image */}
        {instructor.user.profile_image ? (
          <img
            src={getMediaUrl(instructor.user.profile_image)}
            alt={`${instructor.user.first_name} ${instructor.user.last_name}`}
            className="h-full w-full object-cover transition-transform duration-700 scale-[1.01] group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-dark">
            <User className="h-20 w-20 text-white/10" />
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />

        {/* Content on Image */}
        <div className="absolute inset-x-0 bottom-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
          
          {/* Transparent gray background (no border, left aligned) */}
          <div className="bg-gray-900/40 backdrop-blur-sm px-4 py-3 rounded-lg inline-block">
            
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1 text-left">
              {instructor.proficiency?.[0] ||
                instructor.skills?.[0] ||
                "Մասնագետ"}
            </p>

            <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none italic text-left">
              {instructor.user.first_name} <br />
              <span className="text-white/90">
                {instructor.user.last_name}
              </span>
            </h3>

          </div>
        </div>
      </div>

      {/* Info Below */}
      <div className="mt-4 px-2">
        <p className="text-xs text-gray-light opacity-60 line-clamp-2 italic leading-relaxed group-hover:opacity-100 transition-opacity duration-500">
          {instructor.bio ||
            "Logic Lab-ի փորձառու մասնագետ, ով պատրաստ է կիսվել իր գիտելիքներով:"}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-wrap gap-1.5 flex-grow">
            {instructor.skills?.slice(0, 2).map((skill: string) => (
              <span
                key={skill}
                className="text-[9px] font-black uppercase tracking-wider text-white/40 border border-white/10 px-2 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const InstructorsSection = () => {
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: getInstructors,
  });

  if (isLoading) {
    return (
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="h-12 w-64 bg-gray-dark rounded mb-16 animate-pulse" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] bg-gray-dark rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!instructors || instructors.length === 0) return null;

  return (
    <section id="instructors" className="py-24 bg-black overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[2px] w-12 bg-primary" />
          </div>
          <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9]">
            Մեր <span className="text-primary">Թիմը</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
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