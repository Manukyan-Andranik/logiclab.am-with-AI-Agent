// InteractiveGuide.tsx — Modernized with focus trap, step counter, and responsive polish
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, HelpCircle, Bot, Layout, Info, Keyboard } from 'lucide-react';

// ─── Step definitions ─────────────────────────────────────────────────────────
interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent?: string;
  tag?: string;
}

const STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Բարի գալուստ Logic Lab',
    tag: 'Ներածություն',
    description:
      'Եկեք արագ ծանոթանանք մեր նավիգացիայի ռեժիմներին։ Ընդամենը 3 քայլ՝ ձեզ ճիշտ ուղղությամբ ուղղորդելու համար։',
    icon: <Info size={20} />,
    accent: '👋',
  },
  {
    id: 'ai-mode',
    title: 'Ժամանակակից AI ռեժիմ',
    tag: 'Բետա հնարավորություն',
    description:
      'Ընտրացանկ-սեղմելու փոխարեն պարզապես խոսեք մեր AI Agent-ի հետ բնական հայերենով։ Agent-ը կատարում է ամբողջ նավիգացիան ձեր փոխարեն՝ ակնթարթորեն հասնելով ցանկացած հատված։',
    icon: <Bot size={20} />,
  },
  {
    id: 'classic-mode',
    title: 'Դասական ռեժիմ',
    tag: 'Ծանոթ փորձ',
    description:
      'Նախընտրու՞մ եք ծանոթ կառուցվածքը։ Ավանդական ռեժիմն ունի հստակ ընտրացանկեր, կոճակներ և կազմակերպված բաժիններ ձեռքով հայտնաբերման համար։',
    icon: <Layout size={20} />,
  },
  {
    id: 'tips',
    title: 'Կարևոր խորհուրդ',
    tag: 'Ազատ ռեժիմ',
    description:
      'Ռեժիմների միջև կարելի է անցնել ցանկացած ժամանակ կարգավորումներից։ Կորե՞լ եք — գտեք ոսկեգույն «?» կոճակն էկրանի անկյունում կամ սեղմեք ստեղնաշարի «?» կոճակը։',
    icon: <HelpCircle size={20} />,
    accent: '💡',
  },
];

// ─── Keyboard hint badge ──────────────────────────────────────────────────────
const KeyHint: React.FC<{ keys: string[] }> = ({ keys }) => (
  <div className="hidden sm:flex items-center gap-1.5 text-white/20">
    <Keyboard size={11} />
    <span className="text-[10px] font-semibold">
      {keys.map((k, i) => (
        <React.Fragment key={k}>
          <kbd className="font-mono">{k}</kbd>
          {i < keys.length - 1 && <span className="mx-1 text-white/15">/</span>}
        </React.Fragment>
      ))}
    </span>
  </div>
);

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="relative h-1 bg-white/8 rounded-full overflow-hidden">
    <motion.div
      className="absolute inset-y-0 left-0 bg-[var(--primary)] rounded-full"
      initial={false}
      animate={{ width: `${((current + 1) / total) * 100}%` }}
      transition={{ type: 'spring', stiffness: 200, damping: 28 }}
    />
  </div>
);

// ─── Step dot indicators ──────────────────────────────────────────────────────
const StepDots: React.FC<{
  steps: GuideStep[];
  current: number;
  onJump: (i: number) => void;
}> = ({ steps, current, onJump }) => (
  <div className="flex gap-1.5 items-center" role="tablist" aria-label="Guide steps">
    {steps.map((step, i) => (
      <button
        key={step.id}
        role="tab"
        aria-selected={i === current}
        aria-label={`Step ${i + 1}: ${step.title}`}
        onClick={() => onJump(i)}
        className={`
          h-1.5 rounded-full transition-all duration-400 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--primary)]
          ${i === current ? 'w-6 bg-[var(--primary)]' : 'w-1.5 bg-white/15 hover:bg-white/35'}
        `}
      />
    ))}
  </div>
);

// ─── Single step card content ─────────────────────────────────────────────────
const StepContent: React.FC<{ step: GuideStep; stepNumber: number; total: number }> = ({
  step,
  stepNumber,
  total,
}) => (
  <motion.div
    key={step.id}
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -24 }}
    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    className="space-y-5"
  >
    {/* Accent emoji + Icon */}
    <div className="flex items-center gap-4">
      {step.accent && (
        <span className="text-5xl leading-none select-none drop-shadow-lg" aria-hidden>
          {step.accent}
        </span>
      )}
      <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/12 border border-[var(--primary)]/20
                      flex items-center justify-center text-[var(--primary)]">
        {step.icon}
      </div>
    </div>

    {/* Step counter + tag (improved visibility) */}
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-white/30 font-semibold">
        {stepNumber}/{total}
      </span>
      {step.tag && (
        <>
          <span className="text-white/15 text-xs">·</span>
          <span className="text-[10px] font-bold text-[var(--primary)]/60 uppercase tracking-widest">
            {step.tag}
          </span>
        </>
      )}
    </div>

    {/* Title */}
    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-snug">
      {step.title}
    </h3>

    {/* Description */}
    <p className="text-white/55 text-sm md:text-[15px] leading-relaxed font-medium">
      {step.description}
    </p>
  </motion.div>
);

// ─── Custom hook for focus trap ───────────────────────────────────────────────
function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    // Set initial focus to the first element
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, containerRef]);
}

// ─── Main component ───────────────────────────────────────────────────────────
interface InteractiveGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const InteractiveGuide: React.FC<InteractiveGuideProps> = ({ isOpen, onClose }) => {
  const [current, setCurrent] = useState(0);
  const prefersReduced = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);

  const isLast = current === STEPS.length - 1;

  // Reset on open and lock body scroll
  useEffect(() => {
    if (isOpen) {
      setCurrent(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Focus trap
  useFocusTrap(isOpen, modalRef);

  const handleNext = useCallback(() => {
    if (!isLast) {
      setCurrent((p) => p + 1);
    } else {
      localStorage.setItem('has_seen_full_guide', 'true');
      onClose();
    }
  }, [isLast, onClose]);

  const handlePrev = useCallback(() => {
    setCurrent((p) => Math.max(0, p - 1));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleNext, handlePrev, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ուղեցույց"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.25 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />

          {/* Card with focus trap container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 28 }}
            transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 28 }}
            className="relative z-10 w-full max-w-md sm:max-w-lg"
          >
            {/* Glow behind card */}
            <div
              className="absolute inset-0 -z-10 blur-[80px] rounded-[40px] bg-[var(--primary)]/10 scale-110"
              aria-hidden
            />

            <div
              className="relative bg-[var(--gray-dark)] border border-white/8 rounded-[28px]
                         shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Top accent stripe */}
              <div className="h-1 bg-gradient-to-r from-[var(--primary)]/0 via-[var(--primary)] to-[var(--primary)]/0" />

              {/* Header bar with ESC hint */}
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                  Logic Lab · Ուղեցույց
                </span>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[10px] text-white/20">ESC</span>
                  <button
                    onClick={onClose}
                    aria-label="Փակել ուղեցույցը"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/30
                               hover:text-white transition-all focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 pb-6 pt-2">
                {/* Progress */}
                <ProgressBar current={current} total={STEPS.length} />

                {/* Step content with AnimatePresence swap */}
                <div className="mt-6 min-h-[200px]">
                  <AnimatePresence mode="wait">
                    <StepContent
                      step={STEPS[current]}
                      stepNumber={current + 1}
                      total={STEPS.length}
                    />
                  </AnimatePresence>
                </div>

                {/* Footer: dots + buttons */}
                <div className="mt-8 flex items-center justify-between gap-4">
                  <StepDots steps={STEPS} current={current} onJump={setCurrent} />

                  <div className="flex items-center gap-2">
                    <KeyHint keys={['←', '→']} />
                    {current > 0 && (
                      <button
                        onClick={handlePrev}
                        aria-label="Նախորդ քայլ"
                        className="p-2.5 rounded-xl bg-white/6 text-white/40 hover:text-white
                                   hover:bg-white/10 transition-all focus-visible:outline-none
                                   focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        <ChevronLeft size={18} />
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      aria-label={isLast ? 'Ավարտել ուղեցույցը' : 'Հաջորդ քայլ'}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                                 bg-[var(--primary)] text-[var(--black)]
                                 text-xs font-black uppercase tracking-[0.18em]
                                 hover:brightness-105 active:scale-95
                                 transition-all focus-visible:outline-none
                                 focus-visible:ring-2 focus-visible:ring-offset-2
                                 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-[var(--gray-dark)]"
                    >
                      {isLast ? 'Ավարտել' : 'Հաջորդ'}
                      <ChevronRight size={15} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Skip link — moved closer to buttons */}
                {!isLast && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        localStorage.setItem('has_seen_full_guide', 'true');
                        onClose();
                      }}
                      className="text-[10px] text-white/20 hover:text-white/50 font-semibold
                                 uppercase tracking-widest transition-colors underline-offset-2
                                 hover:underline focus-visible:outline-none"
                    >
                      Բաց թողնել ուղեցույցը
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InteractiveGuide;