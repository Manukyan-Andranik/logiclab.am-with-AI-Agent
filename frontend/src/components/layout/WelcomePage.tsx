import React, { useState, useEffect } from 'react';
import {
  Bot,
  Navigation,
  Sparkles,
  ArrowRight,
  Play,
  HelpCircle,
  Info,
} from 'lucide-react';
import { NavigationMode } from '../../hooks/useNavigationMode';
import { motion } from 'framer-motion';
import heroVideo from "../../assets/hero-video.mp4";
import InteractiveGuide from './InteractiveGuide';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '../ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface WelcomePageProps {
  onSelect: (mode: NavigationMode) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onSelect }) => {
  const [showFullGuide, setShowFullGuide] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('has_seen_full_guide');
    if (!seen) {
      const timer = setTimeout(() => setShowFullGuide(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setHasSeenGuide(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--black)] flex items-center justify-center p-6 overflow-hidden relative selection:bg-[var(--primary)] selection:text-[var(--black)]">
      
      <InteractiveGuide isOpen={showFullGuide} onClose={() => setShowFullGuide(false)} />

      {/* Background Animated Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.08, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[var(--primary)] blur-[150px] rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--primary)] blur-[120px] rounded-full"
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-6xl w-full relative z-10">
        {/* Header Section */}
        <header className="text-center mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[var(--gray-dark)]/50 backdrop-blur-md border border-[var(--primary)]/30 mb-4 shadow-lg shadow-black/20"
          >
            <Sparkles className="w-4 h-4 text-[var(--primary)] animate-pulse" />
            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">
              Հաջորդ սերնդի հարթակ
            </span>
          </motion.div>

          <div className="flex justify-center mb-10">
            <img
              src="/logo.png"
              alt="Logic Lab"
              className="h-24 w-auto object-contain"
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[var(--gray-light)]/70 max-w-2xl mx-auto text-lg md:text-xl font-medium"
          >
            Ընտրեք նավիգացիոն ռեժիմը՝ մեր խելացի էկոհամակարգի հետ փոխգործակցությունը սկսելու համար։
          </motion.p>
        </header>

        {/* Navigation Mode Cards */}
        <div className="grid md:grid-cols-2 gap-10">

          {/* AI Mode Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          >
            <button
              onClick={() => onSelect('modern')}
              className="group relative w-full flex flex-col md:flex-row p-12 rounded-[40px] bg-[var(--gray-dark)]/40 backdrop-blur-xl border-2 border-white/5 hover:border-[var(--primary)]/50 transition-all duration-700 text-left overflow-hidden shadow-2xl"
            >
              <div className="relative z-10 flex-1 flex flex-col h-full">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-20 h-20 rounded-[24px] bg-[var(--primary)] text-[var(--primary-alt)] flex items-center justify-center shadow-[0_0_50px_rgba(255,215,0,0.4)] group-hover:scale-110 transition-transform duration-700 ease-out">
                    <Bot size={42} strokeWidth={2.5} />
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-3 rounded-full bg-white/5 hover:bg-[var(--primary)] hover:text-[var(--black)] transition-all duration-300 group/btn"
                      >
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl bg-[var(--black)] border-[var(--gray-dark)] text-[var(--white)] p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                      <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-3xl font-black flex items-center gap-4 text-white uppercase tracking-tighter">
                          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-[var(--black)] flex items-center justify-center">
                            <Bot size={24} />
                          </div>
                          AI ՆԱՎԻԳԱՑԻԱՅԻ ՈՒՂԵՑՈՒՅՑ
                        </DialogTitle>
                        <DialogDescription className="text-[var(--gray-light)] opacity-60 text-lg font-medium">
                          Բացահայտեք, թե ինչպես է մեր խելացի գործակալը վերափոխում ձեր փորձը բնական լեզվով փոխգործակցության միջոցով։
                        </DialogDescription>
                      </DialogHeader>
                      <div className="aspect-video bg-black relative border-y border-white/5">
                        <video
                          src={heroVideo}
                          controls
                          autoPlay
                          loop
                          muted
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6 bg-[var(--gray-dark)]/50 flex justify-between items-center">
                        <p className="text-sm font-bold text-[var(--primary-alt)] uppercase tracking-widest">Logic Lab Academy • Neural Link v4</p>
                        <button className="px-6 py-2 rounded-xl bg-white/5 text-white hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all">Փակել ուղեցույցը</button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <h3 className="text-3xl font-black text-[var(--white)] mb-4 tracking-tight uppercase group-hover:text-[var(--primary)] transition-colors duration-300">
                    Ժամանակակից AI <br /> Նավիգացիա
                </h3>

                <p className="text-[var(--gray-light)]/60 mb-12 flex-grow text-lg leading-relaxed font-medium">
                  Փոխազդեք հարթակի հետ բնական լեզվի միջոցով։ Մեր Logic Agent-ը հասկանում է ձեր մտադրությունը և նավիգացում էկոհամակարգում ձեր փոխարեն։
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[var(--primary)] font-black uppercase tracking-[0.2em] text-sm group-hover:gap-6 transition-all duration-500">
                    Գործարկել AI ինտերֆեյս
                    <ArrowRight size={22} strokeWidth={3} />
                  </div>
                  <div className="px-3 py-1 rounded-md bg-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest border border-white/5">
                    Բետա v4.2
                  </div>
                </div>
              </div>

              {/* Side Section: AI Video */}
              <div className="mt-6 md:mt-0 md:ml-8 md:flex-shrink-0 w-full md:w-64 h-40 relative rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <video
                  src={heroVideo}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </button>
          </motion.div>

          {/* Traditional Mode Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          >
            <button
              onClick={() => onSelect('traditional')}
              className="group relative w-full flex flex-col md:flex-row p-12 rounded-[40px] bg-[#1a1a1a]/60 backdrop-blur-xl border-2 border-white/5 hover:border-[var(--primary)]/50 transition-all duration-700 text-left overflow-hidden shadow-2xl"
            >
              <div className="relative z-10 flex-1 flex flex-col h-full">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-20 h-20 rounded-[24px] bg-[var(--gray-dark)] text-[var(--white)] flex items-center justify-center border border-white/10 group-hover:bg-[var(--primary)] group-hover:text-[var(--black)] group-hover:border-transparent group-hover:shadow-[0_0_50px_rgba(255,215,0,0.3)] transition-all duration-700 ease-out">
                    <Navigation size={42} strokeWidth={2.5} />
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-3 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                          <Info size={20} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[var(--gray-dark)] border-white/10 text-white font-bold text-xs p-3 rounded-xl shadow-2xl">
                        Կառուցվածքային բազմաէջ դասավորություն
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <h3 className="text-3xl font-black text-[var(--white)] mb-4 tracking-tight uppercase group-hover:text-[var(--primary)] transition-colors duration-300">
                  Դասական <br /> Ինտերֆեյս
                </h3>

                <p className="text-[var(--gray-light)]/60 mb-12 flex-grow text-lg leading-relaxed font-medium">
                  Ավանդական վեբ փորձ կառուցվածքային ընտրացանկերով, ինտուիտիվ Նավիգացիա և ձեռքով հայտնաբերման կազմակերպված բաժիններով։
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[var(--gray-light)] group-hover:text-[var(--primary)] font-black uppercase tracking-[0.2em] text-sm group-hover:gap-6 transition-all duration-500">
                    Ստանդարտ տեսք
                    <ArrowRight size={22} strokeWidth={3} />
                  </div>
                  <div className="px-3 py-1 rounded-md bg-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest border border-white/5">
                    Դասական
                  </div>
                </div>
              </div>

              {/* Side Section: Traditional Image/Icon */}
              <div className="mt-6 md:mt-0 md:ml-8 md:flex-shrink-0 w-full md:w-40 h-40 flex items-center justify-center bg-[var(--gray-dark)]/20 rounded-xl border border-white/10 shadow-lg">
                <Navigation size={48} strokeWidth={2.5} className="text-[var(--primary)]" />
              </div>
            </button>
          </motion.div>

        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 1.2 }}
          className="flex flex-col items-center mt-20 space-y-4"
        >
          <div className="flex items-center gap-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/10" />
            <p className="text-[10px] text-[var(--gray-light)]/30 font-black uppercase tracking-[0.5em]">
              Powered by LogicLab • Հարթակ v1.0.0
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/10" />
          </div>
        </motion.footer>

        {/* Floating Help Button */}
        <div className="fixed bottom-8 right-8 z-[100]">
          <button
            onClick={() => setShowFullGuide(true)}
            className="w-16 h-16 rounded-full bg-[var(--primary)] text-[var(--primary-alt)] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group"
          >
            <HelpCircle size={28} strokeWidth={3} />
            <span className="absolute right-full mr-4 bg-[var(--gray-dark)] text-[var(--primary-alt)] text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Օգնության կարիք կա՞
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomePage;