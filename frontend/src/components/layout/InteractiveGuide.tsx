import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, HelpCircle, Bot, Layout, Info } from 'lucide-react';

interface GuideStep {
  targetId?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const steps: GuideStep[] = [
  {
    title: "Բարի գալուստ Logic Lab",
    description: "Եկեք արագ ծանոթանանք մեր նավիգացիայի ռեժիմներին։ Սա կօգնի ձեզ ընտրել ձեր կարիքներին լավագույնս հարմար փորձը։",
    icon: <Info className="text-[var(--primary)]" size={24} />,
    position: 'center'
  },
  {
    title: "Ժամանակակից AI ռեժիմ",
    description: "Սա մեր հեղափոխական նավիգացիոն համակարգն է։ Ընտրացանկեր սեղմելու փոխարեն դուք պարզապես խոսում եք մեր AI Agent-ի հետ։ Այն կարող է ձեզ ակնթարթորեն տեղափոխել հարթակի ցանկացած հատված։",
    icon: <Bot className="text-[var(--primary)]" size={24} />,
    position: 'left'
  },
  {
    title: "Դասական ռեժիմ",
    description: "Նախընտրու՞մ եք դասական եղանակը։ Մեր ավանդական ռեժիմն ապահովում է ստանդարտ ընտրացանկեր, կոճակներ և ծանոթ կառուցվածքային դասավորություն։",
    icon: <Layout className="text-[var(--primary)]" size={24} />,
    position: 'right'
  },
  {
    title: "Միշտ պատրաստ ենք օգնել",
    description: "Ռեժիմների միջև ցանկացած ժամանակ կարող եք անցնել ստորոտից։ Եթե կորել եք, փնտրեք ինձ ներքևի անկյունում։",
    icon: <HelpCircle className="text-[var(--primary)]" size={24} />,
    position: 'bottom'
  }
];

interface InteractiveGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const InteractiveGuide: React.FC<InteractiveGuideProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
      localStorage.setItem('has_seen_full_guide', 'true');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative z-10 w-full max-w-md bg-[var(--gray-dark)] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden ${
              step.position === 'center' ? '' : 
              step.position === 'left' ? 'md:mr-[30%]' :
              step.position === 'right' ? 'md:ml-[30%]' :
              step.position === 'bottom' ? 'mt-auto mb-12' : ''
            }`}
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 blur-[50px] rounded-full -mr-16 -mt-16" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  {step.icon}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={20} className="text-white/40" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  {step.title}
                </h3>
                <p className="text-[var(--gray-light)]/70 text-base leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-[var(--primary)]' : 'w-2 bg-white/20'}`} 
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="p-3 rounded-xl bg-white/5 text-gray-light/40 hover:text-white transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-[var(--gray-light)] font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all"
                  >
                    {currentStep === steps.length - 1 ? 'Ավարտել' : 'Հաջորդ'}
                    <ChevronRight size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          
          {step.targetId && (
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="absolute pointer-events-none"
             />
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default InteractiveGuide;