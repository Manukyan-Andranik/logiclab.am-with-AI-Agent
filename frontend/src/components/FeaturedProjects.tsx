import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFeaturedProjects } from "@/api/projects";
import { getLocalizedContent } from "@/lib/localization";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getMediaUrl } from "@/api/client";

/* =======================
   DOT INDICATORS
======================= */
const DotIndicators = ({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
}) => (
  <div className="flex gap-2 items-center">
    {Array.from({ length: count }).map((_, i) => (
      <button
        key={i}
        onClick={() => onSelect(i)}
        className={`rounded-full transition-all duration-300 ${
          i === active
            ? "bg-gold w-6 h-1"
            : "bg-white/20 w-1.5 h-1.5 hover:bg-white/40"
        }`}
      />
    ))}
  </div>
);

/* =======================
   BIG COVER
======================= */
const ProjectCover = ({ project }: { project: any }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const images =
    project.image_urls?.length > 0 ? project.image_urls : ["/placeholder.svg"];

  useEffect(() => {
    setCurrentImageIndex(0);
    setExpanded(false);
  }, [project.id]);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const title = getLocalizedContent(project.title);
  const subtitle = getLocalizedContent(project.subtitle);
  const description = getLocalizedContent(project.description);

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border border-border bg-card flex flex-col min-h-[540px] lg:aspect-square"
    >
      {/* IMAGE */}
      <div className="relative h-[65%] overflow-hidden bg-black-solid">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIndex}
            src={getMediaUrl(images[currentImageIndex])}
            alt={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <DotIndicators
              count={images.length}
              active={currentImageIndex}
              onSelect={setCurrentImageIndex}
            />
          </div>
        )}

        {/* VIEW LINK */}
        <Link
          to={`/projects/${project.id}`}
          className="absolute inset-0 flex items-end p-6 bg-black/0 hover:bg-black/40 transition"
        >
          <span className="opacity-0 group-hover:opacity-100 text-primary flex items-center gap-2 text-xs font-black uppercase tracking-widest">
            Տեսնել ավելին <ExternalLink className="w-4 h-4" />
          </span>
        </Link>
      </div>

      {/* TEXT */}
      <div className="flex flex-col p-6 lg:p-8 flex-1 justify-between">
        <div className="space-y-3">
          <div className="flex flex-col">
            <h3 className="text-2xl lg:text-3xl font-black text-foreground uppercase tracking-tight italic">
              {title}
            </h3>
            {subtitle && (
              <p className="text-primary text-sm font-black uppercase tracking-widest mt-1">
                {subtitle}
              </p>
            )}
          </div>

          <div className="relative">
            <p
              className={`text-muted-foreground text-[16px] leading-relaxed transition-all duration-500 ${
                !expanded ? "line-clamp-4" : ""
              }`}
            >
              {description}
            </p>

          </div>
        </div>

        {description.length > 150 && (
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="mt-4 text-gold text-[12px] font-black uppercase tracking-widest hover:opacity-80"
          >
            Կարդալ ավելին →
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* =======================
   PREVIEW CARD
======================= */
const ProjectPreview = ({
  project,
  isActive,
  onClick,
  index,
}: {
  project: any;
  isActive: boolean;
  onClick: () => void;
  index: number;
}) => {
  const image = project.image_urls?.[0] || "/placeholder.svg";
  const title = getLocalizedContent(project.title);

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`group cursor-pointer relative rounded-xl overflow-hidden border transition-all duration-300 w-full aspect-square
        ${isActive
          ? "border-gold ring-1 ring-gold/40"
          : "border-border hover:border-white/30"
        }`}
    >
      <img
        src={getMediaUrl(image)}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all"
      />

      <div
        className={`absolute inset-0 bg-black-solid/60 transition-opacity ${
          isActive ? "opacity-20" : "group-hover:opacity-40"
        }`}
      />

      <div className="absolute inset-0 p-3 flex items-end">
        <p className="text-foreground text-[10px] font-black uppercase line-clamp-2 tracking-tight">
          {title}
        </p>
      </div>
    </motion.div>
  );
};

/* =======================
   MAIN COMPONENT
======================= */
const FeaturedProjects = () => {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["featured-projects"],
    queryFn: getFeaturedProjects,
  });

  const [activeProject, setActiveProject] = useState<any>(null);

  useEffect(() => {
    if (projects?.length) {
      setActiveProject(projects[projects.length - 1]);
    }
  }, [projects]);

  if (isLoading || !projects || !activeProject) return null;

  return (
    <section id="projects" className="py-24 bg-black-solid">
      <div className="container mx-auto px-6">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[var(--primary-alt)] uppercase tracking-tighter">
            Ուսանողների <span className="text-[var(--white)]">նախագծերից</span>
          </h2>
        </motion.div>

        {/* GRID */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ProjectCover project={activeProject} />
          </div>

          <div className="flex lg:grid lg:grid-cols-2 gap-4 overflow-x-auto lg:overflow-visible pb-6 lg:pb-0 -mx-6 px-6 lg:mx-0 lg:px-0 no-scrollbar">
            {projects.map((project, index) => (
              <div key={project.id} className="flex-shrink-0 w-[150px] lg:w-full">
                <ProjectPreview
                  project={project}
                  isActive={activeProject.id === project.id}
                  onClick={() => setActiveProject(project)}
                  index={index}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProjects;