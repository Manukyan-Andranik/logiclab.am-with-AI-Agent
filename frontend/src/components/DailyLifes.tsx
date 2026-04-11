import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFeaturedDailyLife } from "@/api/daily-life";
import { getLocalizedContent } from "@/lib/localization";
import { motion, AnimatePresence } from "framer-motion";
import { DailyLife } from "@/api/types";
import { getMediaUrl } from "@/api/client";

const PLACEHOLDER = "/placeholder.svg";
const IMAGE_INTERVAL_MS = 2000;
const DESCRIPTION_THRESHOLD = 150;

/* =======================
   SKELETON
======================= */
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card animate-pulse">
    <div className="aspect-[4/3] bg-white/5" />
    <div className="p-4 space-y-3">
      <div className="h-6 bg-white/5 rounded w-3/4" />
      <div className="h-4 bg-white/5 rounded w-full" />
      <div className="h-4 bg-white/5 rounded w-5/6" />
    </div>
  </div>
);

const SkeletonSidebar = () => (
  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2 lg:gap-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
    ))}
  </div>
);

/* =======================
   ARROW BUTTON
======================= */
const ArrowBtn = ({
  direction,
  onClick,
  label,
  size = "md",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  label: string;
  size?: "sm" | "md";
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`rounded-full border border-white/20 bg-black-solid/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:border-white/50 hover:bg-black-solid/80 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
      size === "sm" ? "w-7 h-7" : "w-9 h-9"
    }`}
  >
    <svg
      width={size === "sm" ? 12 : 14}
      height={size === "sm" ? 12 : 14}
      viewBox="0 0 14 14"
      fill="none"
    >
      {direction === "prev" ? (
        <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  </button>
);

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
  <div className="flex gap-1.5 items-center" role="tablist" aria-label="Image navigation">
    {Array.from({ length: count }).map((_, i) => (
      <button
        key={i}
        role="tab"
        aria-selected={i === active}
        aria-label={`Image ${i + 1} of ${count}`}
        onClick={() => onSelect(i)}
        className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          i === active
            ? "bg-gold w-5 h-1"
            : "bg-white/30 w-1 h-1 hover:bg-white/60"
        }`}
      />
    ))}
  </div>
);

/* =======================
   COVER COMPONENT
======================= */
const DailyLifeCover = ({ story }: { story: DailyLife }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const images = story.image_urls?.length > 0 ? story.image_urls : [PLACEHOLDER];
  const title = getLocalizedContent(story.title) ?? "";
  const description = getLocalizedContent(story.description) ?? "";
  const isLongDescription = description.length > DESCRIPTION_THRESHOLD;
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    setCurrentImageIndex(0);
    setExpanded(false);
  }, [story.id]);

  useEffect(() => {
    if (!hasMultipleImages || isPaused) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, IMAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [images.length, isPaused, hasMultipleImages]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) delta < 0 ? nextImage() : prevImage();
    touchStartX.current = null;
  };

  return (
    <motion.div
      key={story.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl overflow-hidden border border-border bg-card flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* IMAGE */}
      <div
        className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[4/3] overflow-hidden bg-black-solid flex-shrink-0 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIndex}
            src={getMediaUrl(images[currentImageIndex])}
            alt={`${title} — photo ${currentImageIndex + 1}`}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </AnimatePresence>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {hasMultipleImages && (
          <>
            {/* Arrows — hidden on mobile (swipe instead), visible sm+ */}
            <div className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2">
              <ArrowBtn direction="prev" onClick={prevImage} label="Previous image" size="sm" />
            </div>
            <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2">
              <ArrowBtn direction="next" onClick={nextImage} label="Next image" size="sm" />
            </div>

            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <DotIndicators
                count={images.length}
                active={currentImageIndex}
                onSelect={setCurrentImageIndex}
              />
            </div>

            <div className="absolute top-3 right-3 bg-black-solid/70 backdrop-blur-sm text-white/70 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* TEXT — tighter padding on mobile */}
      <div className="flex flex-col p-4 sm:p-6 lg:p-8 gap-3">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground leading-[1.1] tracking-tight uppercase italic">
          {title}
        </h3>

        <div className="relative">
          <p
            className={`text-muted-foreground text-[14px] sm:text-[15px] leading-relaxed transition-all duration-500 ${
              !expanded ? "line-clamp-3 sm:line-clamp-4" : ""
            }`}
          >
            {description}
          </p>
          {!expanded && isLongDescription && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          )}
        </div>

        {isLongDescription && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="self-start flex items-center gap-1.5 text-gold text-[11px] font-black uppercase tracking-widest hover:opacity-70 active:opacity-50 transition-opacity focus:outline-none focus-visible:underline"
          >
            {expanded ? "Փակել" : "Կարդալ ավելին"}
            <span
              className={`inline-block transition-transform duration-300 ${expanded ? "rotate-90" : "rotate-0"}`}
              aria-hidden="true"
            >
              →
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* =======================
   PREVIEW CARD
======================= */
const DailyLifePreview = ({
  story,
  isActive,
  onClick,
  index,
}: {
  story: DailyLife;
  isActive: boolean;
  onClick: () => void;
  index: number;
}) => {
  const image = story.image_urls?.[0] ?? PLACEHOLDER;
  const title = getLocalizedContent(story.title) ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={title}
      className={`group cursor-pointer relative rounded-xl overflow-hidden border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
        isActive
          ? "border-gold ring-1 ring-gold/40"
          : "border-border hover:border-white/30"
      }`}
    >
      <div className="relative w-full aspect-square bg-black-solid">
        <img
          src={getMediaUrl(image)}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ${
            isActive ? "grayscale-0 brightness-90" : "grayscale-[0.5] group-hover:grayscale-0"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {isActive && (
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gold" />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-[9px] sm:text-[10px] font-black leading-tight line-clamp-2 uppercase tracking-tighter">
            {title}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

/* =======================
   EMPTY STATE
======================= */
const EmptyState = () => (
  <div className="flex items-center justify-center py-16">
    <p className="text-muted-foreground">Բովանդակություն չի գտնվել</p>
  </div>
);

/* =======================
   MAIN
======================= */
const DailyLifes = () => {
  const { data: stories, isLoading, isError } = useQuery({
    queryKey: ["featured-daily-life"],
    queryFn: getFeaturedDailyLife,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const coverRef = useRef<HTMLDivElement>(null);
  const activeStory = stories?.[activeIndex] ?? null;

  useEffect(() => {
    if (stories?.length) setActiveIndex(0);
  }, [stories]);

  const prevStory = useCallback(() => {
    if (!stories?.length) return;
    setActiveIndex((prev) => (prev - 1 + stories.length) % stories.length);
  }, [stories?.length]);

  const nextStory = useCallback(() => {
    if (!stories?.length) return;
    setActiveIndex((prev) => (prev + 1) % stories.length);
  }, [stories?.length]);

  const handleSelectStory = useCallback((index: number) => {
    setActiveIndex(index);
    // On mobile/tablet scroll cover into view
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        coverRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, []);

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-black-solid overflow-hidden" aria-label="Մեր Առօրյան">
      <div className="container mx-auto px-4 sm:px-6">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 sm:mb-12 lg:mb-16"
        >
          <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold text-[var(--primary-alt)] uppercase tracking-tighter">
            Մեր <span className="text-[var(--white)]">Առօրյան</span>
          </h2>
        </motion.div>

        {/* LOADING */}
        {isLoading && (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">
            <div className="lg:col-span-2"><SkeletonCard /></div>
            <SkeletonSidebar />
          </div>
        )}

        {isError && <EmptyState />}

        {!isLoading && !isError && stories && activeStory && (
          /*
            Mobile/tablet: single column — cover on top, nav + grid below.
            Desktop (lg): 2-col grid, cover left, sidebar right.
          */
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 lg:items-start">

            {/* COVER */}
            <div className="lg:col-span-2" ref={coverRef}>
              <DailyLifeCover story={activeStory} />
            </div>

            {/* SIDEBAR */}
            <div className="flex flex-col gap-3">

              {/* Story nav — compact on mobile */}
              {stories.length > 1 && (
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-white/40 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">
                    {activeIndex + 1} / {stories.length}
                  </span>
                  <div className="flex gap-2">
                    <ArrowBtn direction="prev" onClick={prevStory} label="Previous story" size="sm" />
                    <ArrowBtn direction="next" onClick={nextStory} label="Next story" size="sm" />
                  </div>
                </div>
              )}

              {/*
                Preview grid:
                - Mobile:  3 columns (compact thumbnails)
                - sm:      4 columns
                - lg:      2 columns (sidebar layout)
              */}
              <div
                className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2 lg:gap-3"
                role="list"
                aria-label="Բոլոր պատմությունները"
              >
                {stories.map((story, index) => (
                  <div key={story.id} role="listitem">
                    <DailyLifePreview
                      story={story}
                      isActive={activeIndex === index}
                      onClick={() => handleSelectStory(index)}
                      index={index}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {!isLoading && !isError && (!stories || stories.length === 0) && <EmptyState />}

      </div>
    </section>
  );
};

export default DailyLifes;