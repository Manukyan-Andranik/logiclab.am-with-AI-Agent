import { useQuery } from "@tanstack/react-query";
import { getInstructors } from "@/api/instructors";
import { getLocalizedContent } from "@/lib/localization";
import { motion } from "framer-motion";
import { User } from "lucide-react";

const InstructorsSection = () => {
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: getInstructors,
  });

  if (isLoading || !instructors || instructors.length === 0) return null;

  return (
    <section id="instructors" className="py-24 bg-[var(--black)]">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          {/* <span className="text-[var(--primary-alt)] font-display font-bold text-sm uppercase tracking-widest mb-2 block">
            Logic Lab
          </span> */}
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[var(--white)] uppercase tracking-tighter">
            Մեր <span className="text-[var(--primary-alt)]">Դասախոսները</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 bg-[var(--gray-dark)] rounded-2xl animate-pulse" />
            ))
          ) : (
            instructors?.map((instructor, i) => (
              <motion.div
                key={instructor.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-8 text-center group border-2 border-[var(--gray-dark)] hover:border-[var(--primary-alt)] transition-all bg-[var(--gray-dark)]"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-4 border-[var(--black)] shadow-xl group-hover:scale-105 transition-transform">
                  {instructor.user.profile_image ? (
                    <img
                      src={instructor.user.profile_image}
                      alt={`${instructor.user.first_name} ${instructor.user.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--black)] flex items-center justify-center">
                      <User className="w-10 h-10 text-[var(--primary)]" />
                    </div>
                  )}
                </div>
                
                <h3 className="font-display font-black text-xl text-[var(--white)] mb-2 uppercase tracking-tighter leading-tight">
                  {instructor.user.first_name} {instructor.user.last_name}
                </h3>
                <p className="text-[10px] text-[var(--primary-alt)] font-black uppercase tracking-[0.2em]">
                  {instructor.skills?.slice(0, 3).join(", ")}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default InstructorsSection;