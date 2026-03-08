import { useQuery } from "@tanstack/react-query";
import { getFeaturedProjects } from "@/api/projects";
import { getLocalizedContent } from "@/lib/localization";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const FeaturedProjects = () => {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["featured-projects"],
    queryFn: getFeaturedProjects,
  });

  if (isLoading || !projects || projects.length === 0) return null;

  return (
    <section id="projects" className="py-24 bg-[var(--black)]">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[var(--white)] uppercase tracking-tighter">
            Ուսանողների <span className="text-[var(--primary-alt)]">նախագծերը</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/projects/${project.id}`}
                className="block glass-card rounded-3xl overflow-hidden group border-2 border-[var(--gray-dark)] hover:border-[var(--primary-alt)] transition-all bg-[var(--gray-dark)]"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    {...(project.image_urls[0] ? { src: project.image_urls[0] } : { src: "https://blog.cloudxlab.com/wp-content/uploads/2019/05/Project-Management-ML-Project-1-1024x607.png" })}
                    alt={getLocalizedContent(project.title)}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-[var(--black)] opacity-0 group-hover:opacity-40 transition-opacity flex items-end p-6">
                    <span className="inline-flex items-center gap-2 text-[var(--primary)] font-black uppercase text-xs tracking-widest">
                      {"\u054f\u0565\u057d\u0576\u0565\u056c \u0561\u057e\u0565\u056c\u056b\u0576"} <ExternalLink className="w-4 h-4" />
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="font-display text-xl font-black text-[var(--white)] mb-3 group-hover:text-[var(--primary-alt)] transition-colors uppercase tracking-tighter">
                    {getLocalizedContent(project.title)}
                  </h3>
                  <p className="text-[var(--gray-light)] opacity-60 text-sm line-clamp-2 font-medium leading-relaxed">
                    {getLocalizedContent(project.description)}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProjects;