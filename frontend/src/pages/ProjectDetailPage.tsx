import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { getProject } from "@/api/projects";
import { motion, AnimatePresence } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import { ArrowLeft, ArrowRight, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useT, useLocalized } from "@/i18n";

// --- Lightbox ---
const Lightbox = ({
  images,
  index,
  onClose,
}: {
  images: string[];
  index: number;
  onClose: () => void;
}) => {
  const [current, setCurrent] = useState(index);

  const prev = useCallback(() => setCurrent((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
        onClick={onClose}
      >
        <X size={28} />
      </button>

      <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/40 text-xs font-black uppercase tracking-widest">
        {current + 1} / {images.length}
      </span>

      {images.length > 1 && (
        <button
          className="absolute left-4 text-white/50 hover:text-white transition-colors p-2"
          onClick={(e) => { e.stopPropagation(); prev(); }}
        >
          <ArrowLeft size={32} />
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.img
          key={current}
          src={images[current]}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl"
          onClick={(e) => e.stopPropagation()}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <button
          className="absolute right-4 text-white/50 hover:text-white transition-colors p-2"
          onClick={(e) => { e.stopPropagation(); next(); }}
        >
          <ArrowRight size={32} />
        </button>
      )}
    </motion.div>
  );
};

// --- ImageGallery Component ---
interface ImageGalleryProps {
  images: string[];
}

export const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const t = useT();

  return (
    <div className="flex flex-col gap-4 mt-8">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[120px] lg:auto-rows-[150px]"
          >
            {images.map((img, index) => (
              <motion.div
                key={index}
                className="relative w-full h-full overflow-hidden rounded-2xl cursor-pointer"
                whileHover={{ scale: 1.05 }}
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={img}
                  alt={`Project image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={images}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- ProjectDetailPage Component ---
const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const t = useT();
  const tx = useLocalized();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <main className="container mx-auto px-6 pt-32 pb-24">
          <Skeleton className="h-8 w-32 mb-8 bg-gray-dark" />
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4 bg-gray-dark" />
            <Skeleton className="h-6 w-1/4 bg-gray-dark" />
            <div className="space-y-4 pt-8">
              <Skeleton className="h-4 w-full bg-gray-dark" />
              <Skeleton className="h-4 w-full bg-gray-dark" />
              <Skeleton className="h-4 w-2/3 bg-gray-dark" />
            </div>
          </div>
          <Skeleton className="mt-12 h-60 w-full bg-gray-dark rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4 text-white uppercase tracking-tighter">
            {t("project_detail.not_found")}
          </h1>
          <Link
            to="/"
            className="text-primary font-black uppercase text-xs tracking-widest hover:underline flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} /> {t("project_detail.back_home")}
          </Link>
        </div>
      </div>
    );
  }

  // first_name/last_name are plain strings today but routed through tx() so a
  // future backend migration to LocalizedText needs no FE change here.
  const studentName = project.student?.user
    ? `${tx(project.student.user.first_name)} ${tx(project.student.user.last_name)}`
    : `Student #${project.student_id}`;

  const courseTitle = project.course?.title
    ? tx(project.course.title)
    : `Course #${project.course_id}`;

  const links = project.links as { demo?: string; github?: string; colab?: string } | null;

  const projectImages = project.image_urls;
  const subtitle = tx(project.subtitle);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-6 pt-32 pb-24 flex flex-col gap-8">
        {/* --- Project Info --- */}
        <div className="space-y-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            {tx(project.title)}
          </h1>
          {subtitle && (
            <p className="text-xl font-bold text-primary uppercase tracking-tight">
              {subtitle}
            </p>
          )}
          <p className="text-[var(--gray-light)]">{tx(project.description)}</p>

          <div className="flex flex-wrap gap-2">
            <Badge>{studentName}</Badge>
            <Badge>{courseTitle}</Badge>
          </div>

          {links && (
            <div className="flex gap-4 mt-4">
              {links.demo && (
                <a
                  href={links.demo}
                  target="_blank"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <ExternalLink size={18} /> Demo
                </a>
              )}
              {links.github && (
                <a
                  href={links.github}
                  target="_blank"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <FaGithub size={18} /> GitHub
                </a>
              )}
            </div>
          )}
        </div>

        {/* --- Gallery Bottom --- */}
        <ImageGallery images={projectImages} />
      </main>
    </div>
  );
};

export default ProjectDetailPage;
