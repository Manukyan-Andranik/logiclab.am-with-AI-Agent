import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { getProject } from "@/api/projects";
import { getLocalizedContent } from "@/lib/localization";
import { motion, AnimatePresence } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import { ArrowLeft, ExternalLink} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// --- ImageGallery Component ---
interface ImageGalleryProps {
  images: string[];
}

export const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4 mt-8">
      <button
        className="text-primary font-bold uppercase text-xs mb-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "Փակել պատկերասրահը" : "Բացել պատկերասրահը"}
      </button>

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
    </div>
  );
};

// --- ProjectDetailPage Component ---
const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");

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
            Նախագիծը չի գտնվել
          </h1>
          <Link
            to="/"
            className="text-primary font-black uppercase text-xs tracking-widest hover:underline flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} /> Վերադառնալ գլխավոր էջ
          </Link>
        </div>
      </div>
    );
  }

  const studentName = project.student?.user
    ? `${project.student.user.first_name} ${project.student.user.last_name}`
    : `Student #${project.student_id}`;

  const courseTitle = project.course?.title
    ? getLocalizedContent(project.course.title)
    : `Course #${project.course_id}`;

  const links = project.links as { demo?: string; github?: string; colab?: string } | null;

  const projectImages = project.image_urls

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-6 pt-32 pb-24 flex flex-col gap-8">
        {/* --- Project Info --- */}
        <div className="space-y-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            {getLocalizedContent(project.title)}
          </h1>
          <p className="text-[var(--gray-light)]">{getLocalizedContent(project.description)}</p>

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