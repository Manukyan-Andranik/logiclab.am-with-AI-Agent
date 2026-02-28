import { useQuery } from "@tanstack/react-query";
import { getFeaturedSuccessStories } from "@/api/success-stories";
import { getLocalizedContent } from "@/lib/localization";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const SuccessStories = () => {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["featured-success-stories"],
    queryFn: getFeaturedSuccessStories,
  });

  if (isLoading || !stories || stories.length === 0) return null;

  return (
    <section id="stories" className="py-24 bg-[var(--black)]">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[var(--primary-alt)] font-display font-bold text-sm uppercase tracking-widest mb-2 block">
            Logic Lab
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[var(--white)] uppercase tracking-tighter">
            Մեր <span className="text-[var(--primary)]">հաջողակները</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-3xl p-8 relative group hover:border-[var(--primary-alt)] transition-all border-2 border-[var(--gray-dark)] bg-[var(--gray-dark)]"
            >
              <div className="absolute top-6 right-8 text-[var(--primary)] opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote size={48} />
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--primary)]">
                  <img
                    src={story.image_urls[0] || "/placeholder.svg"}
                    alt={getLocalizedContent(story.title)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-display font-black text-[var(--white)] group-hover:text-[var(--primary-alt)] transition-colors uppercase tracking-tighter leading-tight">
                    {getLocalizedContent(story.title)}
                  </h3>
                  <p className="text-[10px] text-[var(--primary-alt)] font-black uppercase tracking-[0.2em]">
                    Մեր դասընթաց
                  </p>
                </div>
              </div>

              <p className="text-[var(--gray-light)] opacity-70 leading-relaxed italic relative z-10 text-sm font-medium">
                "{getLocalizedContent(story.content)}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;