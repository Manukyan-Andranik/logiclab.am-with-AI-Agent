import React from 'react';
import { Bot, Navigation, Sparkles, ArrowRight } from 'lucide-react';
import { NavigationMode } from '../../hooks/useNavigationMode';
import { motion } from 'framer-motion';

interface WelcomePageProps {
  onSelect: (mode: NavigationMode) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-[var(--black)] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/5 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <div className="max-w-5xl w-full relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-8"
          >
            <img src="/logo.png" alt="Logic Lab" className="h-20 w-auto object-contain" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--gray-dark)] border border-[var(--primary)]/20 mb-4"
          >
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-[10px] font-mono text-[var(--primary)] uppercase tracking-[0.2em]">
              Welcome to the Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-4xl md:text-6xl font-black text-[var(--white)] tracking-tighter"
          >
            CHOOSE YOUR <br />
            <span className="text-[var(--primary)]">NAVIGATION MODE</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[var(--gray-light)] opacity-60 max-w-2xl mx-auto text-lg"
          >
            Select how you want to interact with our ecosystem. 
            Experience our intelligent AI agent or use traditional menus.
          </motion.p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Option 1: Modern AI */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            whileHover={{ y: -10 }}
            onClick={() => onSelect('modern')}
            className="group relative flex flex-col p-10 rounded-[32px] bg-[var(--gray-dark)] border-2 border-transparent hover:border-[var(--primary)] transition-all duration-500 text-left overflow-hidden shadow-2xl"
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-[var(--primary)]/0 group-hover:bg-[var(--primary)]/5 transition-colors duration-500" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--primary)]/10 blur-[80px] rounded-full group-hover:bg-[var(--primary)]/20 transition-all duration-500" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-20 h-20 rounded-2xl bg-[var(--primary)] text-[var(--primary-alt)] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,215,0,0.3)] group-hover:scale-110 transition-transform duration-500">
                <Bot size={40} />
              </div>

              <h3 className="text-2xl font-black text-[var(--white)] mb-4 tracking-tight uppercase">
                Modern AI Navigation
              </h3>
              
              <p className="text-[var(--gray-light)] opacity-60 mb-10 flex-grow text-base leading-relaxed">
                Interact with the platform using natural language prompts. Our Logic Agent understands your intent and navigates automatically.
              </p>

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--primary)] font-black uppercase tracking-widest text-xs group-hover:gap-5 transition-all">
                  Launch AI Interface
                  <ArrowRight size={18} />
                </div>
                <div className="text-[10px] font-mono text-[var(--white)]/20 uppercase tracking-widest">v4.0.2</div>
              </div>
            </div>
          </motion.button>

          {/* Option 2: Traditional UI */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ y: -10 }}
            onClick={() => onSelect('traditional')}
            className="group relative flex flex-col p-10 rounded-[32px] bg-[#222] border-2 border-[var(--gray-dark)] hover:border-[var(--primary)] transition-all duration-500 text-left overflow-hidden shadow-2xl"
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-[var(--primary)]/0 group-hover:bg-[var(--primary)]/5 transition-colors duration-500" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--white)]/5 blur-[80px] rounded-full group-hover:bg-[var(--primary)]/10 transition-all duration-500" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-20 h-20 rounded-2xl bg-[var(--gray-dark)] text-[var(--primary-alt)] flex items-center justify-center mb-8 border border-[var(--white)]/5 group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-alt)] group-hover:border-transparent transition-all duration-500">
                <Navigation size={40} />
              </div>

              <h3 className="text-2xl font-black text-[var(--white)] mb-4 tracking-tight uppercase">
                Traditional Navigation
              </h3>
              
              <p className="text-[var(--gray-light)] opacity-60 mb-10 flex-grow text-base leading-relaxed">
                Classic web interface with organized menus, buttons, and structured categories. Ideal for manual exploration.
              </p>

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--gray-light)] group-hover:text-[var(--primary)] font-black uppercase tracking-widest text-xs group-hover:gap-5 transition-all">
                  Classic View
                  <ArrowRight size={18} />
                </div>
                <div className="text-[10px] font-mono text-[var(--white)]/20 uppercase tracking-widest">Legacy</div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-center mt-12 text-[10px] text-[var(--gray-light)] opacity-30 font-mono uppercase tracking-[0.3em]"
        >
          Powered by Logic OS • Neural Link Ready • Platform v4.0.2
        </motion.p>
      </div>
    </div>
  );
};

export default WelcomePage;
