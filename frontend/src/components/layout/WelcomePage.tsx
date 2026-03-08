// WelcomePage.tsx — Modernized with tooltip, progress ring, and responsive enhancements
import React, { useState, useEffect } from 'react';
import {
  Bot, Navigation, Sparkles, ArrowRight, Play,
  HelpCircle, Info, Zap, MousePointer2,
} from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence, Variants } from 'framer-motion';
import InteractiveGuide from './InteractiveGuide';

type NavigationMode = 'modern' | 'traditional';
interface WelcomePageProps { onSelect: (mode: NavigationMode) => void; }

// ─── Reusable Tooltip component ───────────────────────────────────────────────
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 
                    bg-[var(--gray-dark)] border border-white/10 text-white text-xs 
                    rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 
                    transition-opacity pointer-events-none z-50 shadow-2xl">
      {content}
    </div>
  </div>
);

// ─── BackgroundCanvas ─────────────────────────────────────────────────────────
const BackgroundCanvas: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    <motion.div
      animate={{ scale: [1, 1.25, 1], opacity: [0.06, 0.1, 0.06] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] bg-[var(--primary)] blur-[180px] rounded-full"
    />
    <motion.div
      animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.07, 0.03] }}
      transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      className="absolute -bottom-[15%] -right-[10%] w-[45%] h-[45%] bg-[var(--primary)] blur-[140px] rounded-full"
    />
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{ backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
    />
  </div>
);

// ─── PlatformBadge ────────────────────────────────────────────────────────────
const PlatformBadge: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.15 }}
    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[var(--gray-dark)]/60 backdrop-blur-md border border-[var(--primary)]/25 shadow-lg shadow-black/20"
  >
    <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" aria-hidden />
    <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.35em]">
      Հաջորդ սերնդի հարթակ
    </span>
  </motion.div>
);

// ─── VideoModal ───────────────────────────────────────────────────────────────
const VideoModal: React.FC<{ src: string; isOpen: boolean; onClose: () => void }> = ({ src, isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="relative w-full max-w-4xl rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.7)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-4 px-6 py-4 bg-[var(--black)] border-b border-white/8">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] text-[var(--black)] flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-wide">AI Նավիգացիայի ուղեցույց</p>
              <p className="text-[10px] text-white/40 font-medium">Logic Lab Academy · Logic AI v1</p>
            </div>
            <button onClick={onClose} aria-label="Փակել"
              className="ml-auto px-4 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
              Փակել
            </button>
          </div>
          <div className="aspect-video bg-black">
            <video src={src} controls autoPlay loop muted className="w-full h-full object-cover" />
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── FeaturePill ──────────────────────────────────────────────────────────────
const FeaturePill: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/8 text-[11px] font-semibold text-white/50">
    {icon}{label}
  </span>
);

// ─── ModeCard ─────────────────────────────────────────────────────────────────
interface ModeCardProps {
  variant: 'ai' | 'traditional';
  onSelect: () => void;
  onWatchVideo?: () => void;
  featured?: boolean;
}

const ModeCard: React.FC<ModeCardProps> = ({ variant, onSelect, onWatchVideo, featured }) => {
  const isAI = variant === 'ai';

  const cardContent = isAI
    ? {
        icon: <Bot size={36} strokeWidth={2.2} />,
        badge: 'Բետա v1',
        title: ['Ժամանակակից AI', 'Նավիգացիա'],
        body: 'Հաղորդակցվեք հարթակի հետ բնական լեզվով։ Logic Agent-ը հասկանում է ձեր մտադրությունը և կատարում նավիգացիան ձեր փոխարեն՝ ակնթարթորեն։',
        cta: 'Գործարկել AI ինտերֆեյս',
      }
    : {
        icon: <Navigation size={36} strokeWidth={2.2} />,
        badge: 'Դասական',
        title: ['Դասական', 'Ինտերֆեյս'],
        body: 'Ավանդական վեբ-փորձ կառուցվածքային ընտրացանկերով, ինտուիտիվ նավիգացիա և կազմակերպված բաժիններ ձեռքով հայտնաբերման համար։',
        cta: 'Ստանդարտ տեսք',
      };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative h-full"
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[var(--primary)] text-[var(--primary-alt)] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[var(--primary)]/30">
            <Sparkles size={10} />Առաջադեմ
          </span>
        </div>
      )}

      <button
        onClick={onSelect}
        aria-label={`Ընտրել ${isAI ? 'AI' : 'դասական'} ռեժիմ`}
        className={`
          group relative w-full h-full text-left rounded-[32px] overflow-hidden
          transition-all duration-500 backdrop-blur-xl shadow-2xl
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]
          focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--black)]
          ${featured
            ? 'bg-[var(--gray-dark)]/50 border-2 border-[var(--primary)]/30 hover:border-[var(--primary)]/70 hover:bg-gradient-to-br hover:from-[var(--primary)]/5 hover:to-transparent'
            : 'bg-[#1a1a1a]/70 border-2 border-white/5 hover:border-white/20'}
        `}
      >
        {/* Hover glow overlay */}
        <div aria-hidden className={`
          absolute inset-0 rounded-[30px] opacity-0 group-hover:opacity-100
          transition-opacity duration-700 pointer-events-none
          ${isAI ? 'bg-gradient-to-br from-[var(--primary)]/8 via-transparent to-transparent'
                 : 'bg-gradient-to-br from-white/4 via-transparent to-transparent'}
        `} />

        <div className="relative z-10 p-6 md:p-8 lg:p-10 flex flex-col gap-5 h-full">

          {/* Row 1 — Icon + badge/controls */}
          <div className="flex items-start justify-between gap-4">
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
              transition-all duration-500
              ${isAI
                ? 'bg-[var(--primary)] text-[var(--primary-alt)] shadow-[0_0_40px_rgba(255,215,0,0.35)] group-hover:shadow-[0_0_60px_rgba(255,215,0,0.5)] group-hover:scale-105'
                : 'bg-[var(--gray-dark)] text-white border border-white/10 group-hover:bg-[var(--primary)] group-hover:text-[var(--white)] group-hover:border-transparent group-hover:shadow-[0_0_40px_rgba(255,215,0,0.3)]'}
            `}>
              {cardContent.icon}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[9px] font-black text-white/30 uppercase tracking-widest">
                {cardContent.badge}
              </span>

              {isAI && onWatchVideo && (
                <button
                  onClick={(e) => { e.stopPropagation(); onWatchVideo(); }}
                  aria-label="Դիտել ուղեցույցի տեսանյութը"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/6 border border-white/8 hover:border-transparent text-white/50 hover:bg-[var(--primary)] hover:text-[var(--black)] text-[10px] font-black uppercase tracking-wider transition-all duration-300"
                >
                  <Play size={10} fill="currentColor" />Ուղեցույց
                </button>
              )}
            </div>
          </div>

          {/* Row 2 — Title */}
          <h2 className={`
            text-2xl md:text-3xl font-black tracking-tight uppercase leading-tight
            transition-colors duration-300
            ${isAI ? 'text-white group-hover:text-[var(--primary)]' : 'text-white/90 group-hover:text-[var(--primary)]'}
          `}>
            {cardContent.title[0]}<br />{cardContent.title[1]}
          </h2>

          {/* Row 3 — Body */}
          <p className="text-[var(--gray-light)]/55 text-sm md:text-[15px] leading-relaxed font-medium">
            {cardContent.body}
          </p>

          {/* Spacer — pushes CTA to bottom */}
          <div className="flex-1" />

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Row 5 — CTA: label left · arrow button right */}
          <div className="flex items-center justify-between gap-4">
            <span className={`
              text-xs font-black uppercase tracking-[0.2em] leading-snug
              transition-colors duration-300
              ${isAI ? 'text-[var(--primary)]' : 'text-white/35 group-hover:text-[var(--primary)]'}
            `}>
              {cardContent.cta}
            </span>

            {/* Animated arrow */}
            <div className={`
              w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
              transition-all duration-300
                'bg-[var(--primary)] text-white/35 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] group-hover:text-[var(--white)]'
            `}>
              <ArrowRight
                size={16}
                strokeWidth={2.5}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </div>
          </div>

        </div>
      </button>
    </motion.div>
  );
};

// ─── WelcomePage ──────────────────────────────────────────────────────────────
const WelcomePage: React.FC<WelcomePageProps> = ({ onSelect }) => {
  const [showGuide, setShowGuide]           = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [progress, setProgress]             = useState(0); // for help button ring
  useReducedMotion();

  // Auto‑open guide after 1.8s with progress animation
  useEffect(() => {
    if (localStorage.getItem('has_seen_full_guide')) return;
    const startTime = Date.now();
    const duration = 1800;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p >= 1) {
        clearInterval(interval);
        setShowGuide(true);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut: '?' opens guide
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === '?') setShowGuide(true); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  const itemVariant: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
  };

  return (
    <div className="min-h-screen bg-[var(--black)] flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden relative selection:bg-[var(--primary)] selection:text-[var(--black)]">
      <BackgroundCanvas />
      <InteractiveGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <VideoModal src="/assets/hero-video.mp4" isOpen={showVideoModal} onClose={() => setShowVideoModal(false)} />

      <motion.div className="max-w-5xl w-full relative z-10" variants={containerVariants} initial="hidden" animate="visible">

        {/* Header */}
        <motion.header variants={itemVariant} className="text-center mb-12 md:mb-16 space-y-5">
          <PlatformBadge />
          <div className="flex justify-center mt-5">
            <img src="/logo.png" alt="Logic Lab" className="h-16 md:h-20 w-auto object-contain" />
          </div>
          <p className="text-[var(--gray-light)]/60 max-w-xl mx-auto text-sm md:text-base lg:text-lg font-medium leading-relaxed px-4">
            Ընտրեք ձեր նախընտրած նավիգացիոն ռեժիմը՝ Logic Lab-ի հետ փոխգործակցությունը սկսելու համար։
          </p>
        </motion.header>

        {/* Cards — items-stretch so both cards match height */}
        <motion.div variants={itemVariant} className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 items-stretch">
          <ModeCard variant="ai" featured onSelect={() => onSelect('modern')} onWatchVideo={() => setShowVideoModal(true)} />
          <ModeCard variant="traditional" onSelect={() => onSelect('traditional')} />
        </motion.div>

        {/* Hint */}
        <motion.p variants={itemVariant} className="text-center text-[11px] text-white/20 font-semibold mt-6 uppercase tracking-widest">
          Ռեժիմը կարելի է փոխել ցանկացած ժամանակ կարգավորումներից
        </motion.p>

        {/* Footer */}
        <motion.footer variants={itemVariant} className="flex items-center justify-center gap-4 mt-14">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-white/8" />
          <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.5em]">Powered by LogicLab · v1.0.0</p>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-white/8" />
        </motion.footer>

      </motion.div>

      {/* Floating help with progress ring */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100]">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, type: 'spring', stiffness: 260, damping: 22 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setShowGuide(true)}
          aria-label="Բաց ուղեցույց"
          className="group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--primary)] text-[var(--primary-alt)] 
                     flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,215,0,0.3)] 
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          style={{
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 ${progress * 4}px rgba(255,215,0,${progress * 0.3})`,
          }}
        >
          <HelpCircle size={24} strokeWidth={2.5} />
          <span aria-hidden className="absolute right-full mr-3 px-3 py-1.5 rounded-xl whitespace-nowrap 
                                       bg-[var(--gray-dark)] border border-white/8 shadow-xl 
                                       text-[10px] font-black text-white uppercase tracking-widest 
                                       opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
            Օգնություն · <kbd className="font-mono text-[var(--primary-alt)]"></kbd>
          </span>
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-[var(--black)] animate-ping opacity-60" />
        </motion.button>
      </div>
    </div>
  );
};

export default WelcomePage;