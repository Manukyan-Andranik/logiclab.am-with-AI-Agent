import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, MessageSquare, Navigation, MousePointer2, Sparkles } from 'lucide-react';

const GUIDE_STEPS = [
  { 
    title: "Ինչ է Logic AI Navigation-ը?", 
    desc: "Սա LogicLab-ի նորարարական մոտեցումն է։ Այստեղ չկան սովորական մենյուներ։ Դուք կառավարում եք կայքը LOGIC-ի միջոցով, որը հասկանում է ձեր ցանկությունները:", 
    icon: <Navigation size={30} />,
    color: "border-primary text-primary"
  },
  { 
    title: "Ինչպես հարցնել?", 
    desc: "Գրեք LOGIC-ին. «Ցույց տուր Python-ի դասերը» կամ «Ովքեր են դասախոսները»։ Նա ակնթարթորեն կտանի ձեզ համապատասխան էջ, կարծես ունենաք անձնական օգնական:", 
    icon: <MessageSquare size={30} />,
    color: "border-primary text-primary"
  },
  { 
    title: "Իսկ եթե նախընտրում եմ դասականը?", 
    desc: "Դուք միշտ կարող եք ընտրել 'Դասական Տեսք' տարբերակը, եթե ցանկանում եք տեսնել սովորական կայքի կառուցվածքը և ինքնուրույն բացահայտել այն:", 
    icon: <MousePointer2 size={30} />,
    color: "border-white text-white"
  }
];

interface InteractiveGuideProps { onClose: () => void; }

const InteractiveGuide: React.FC<InteractiveGuideProps> = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const transition: Transition = { type: 'spring', stiffness: 300, damping: 28 };

  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActiveStep(s => Math.min(s + 1, GUIDE_STEPS.length - 1));
      if (e.key === 'ArrowLeft') setActiveStep(s => Math.max(s - 1, 0));
      if (e.key === 'Escape') { localStorage.setItem('has_seen_full_guide', '1'); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const finish = () => { localStorage.setItem('has_seen_full_guide', '1'); onClose(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" aria-modal="true" role="dialog">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={finish}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.9 }}
        transition={transition}
        className="relative z-10 w-full max-w-xl rounded-[2.5rem] bg-[#1a1a1a] border-2 border-primary shadow-[0_0_50px_rgba(255,215,0,0.15)] overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
          <motion.div 
            className="h-full bg-primary shadow-[0_0_10px_var(--primary)]" 
            initial={{ width: 0 }}
            animate={{ width: `${((activeStep + 1) / GUIDE_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          <div className="flex justify-between items-start mb-10">
            <div className={`p-5 rounded-2xl bg-black border-2 ${GUIDE_STEPS[activeStep].color} transition-all duration-500 shadow-xl`}>
              {GUIDE_STEPS[activeStep].icon}
            </div>
            <button
              ref={closeButtonRef}
              onClick={finish}
              className="p-3 bg-black border border-white/10 hover:border-white rounded-xl text-white/40 hover:text-white transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="min-h-[180px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-3xl font-black text-white mb-6 tracking-tighter uppercase">
                  {GUIDE_STEPS[activeStep].title}
                </h3>
                <p className="text-white opacity-60 text-xl leading-relaxed font-medium">
                  {GUIDE_STEPS[activeStep].desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-14 flex items-center justify-between">
            <div className="flex gap-3">
              {GUIDE_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-500 ${i === activeStep ? 'w-10 bg-primary' : 'w-2 bg-white/10'}`}
                />
              ))}
            </div>

            <div className="flex gap-4">
              {activeStep > 0 && (
                <button
                  onClick={() => setActiveStep(s => s - 1)}
                  className="px-6 py-3 text-white font-black text-sm uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={20} strokeWidth={3} /> Հետ
                </button>
              )}
              
              <button
                onClick={() => activeStep === GUIDE_STEPS.length - 1 ? finish() : setActiveStep(s => s + 1)}
                className="bg-primary text-black px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-[var(--primary)]/20"
              >
                {activeStep === GUIDE_STEPS.length - 1 ? 'Պարզ է' : 'Հաջորդը'} 
                <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-black/40 px-8 py-4 flex items-center gap-3 text-primary text-[10px] font-black uppercase tracking-[0.3em] border-t border-white/5">
          <Sparkles size={14} /> Logic Lab Interactive Guide
        </div>
      </motion.div>
    </div>
  );
};

export default InteractiveGuide;