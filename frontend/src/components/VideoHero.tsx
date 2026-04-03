import { motion } from "framer-motion";
import { getMediaUrl } from "@/api/client";

interface VideoHeroProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const VideoHero = ({ videoSrc, posterSrc, title, titleHighlight, subtitle, children }: VideoHeroProps) => {
  const fullVideoSrc = getMediaUrl(videoSrc);
  const fullPosterSrc = getMediaUrl(posterSrc);

  return (
    <section className="relative min-h-[70vh] flex items-center overflow-hidden bg-black">
      <div className="absolute inset-0">
        <video
          key={fullVideoSrc}
          autoPlay
          muted
          loop
          playsInline
          poster={fullPosterSrc}
          className="w-full h-full object-cover opacity-50"
        >
          <source src={fullVideoSrc} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black opacity-40" />
      </div>

      <div className="relative container mx-auto px-6 pt-24 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-white uppercase tracking-tighter"
        >
          {titleHighlight ? (
            <>
              <span className="text-[var(--primary-alt)]">{titleHighlight}</span>{" "}
              <span>{title}</span>
            </>
          ) : (
            <span>{title}</span>
          )}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-lg sm:text-xl text-[var(--gray-light)] opacity-80 max-w-2xl mb-8 font-medium leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default VideoHero;
