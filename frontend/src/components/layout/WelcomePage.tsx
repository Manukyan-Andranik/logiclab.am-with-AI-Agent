import React, { useState } from 'react';
import { Bot, Navigation, Sparkles, ArrowRight, HelpCircle, Zap, Layout, Home, Heart, Coffee } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import InteractiveGuide from './InteractiveGuide';
import { useT } from '@/i18n';

type NavigationMode = 'modern' | 'traditional';
interface WelcomePageProps { onSelect: (mode: NavigationMode) => void; }

const WelcomePage: React.FC<WelcomePageProps> = ({ onSelect }) => {
  const [showGuide, setShowGuide] = useState(false);
  const t = useT();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { duration: 0.8, ease: [0.25, 0.8, 0.25, 1] } 
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-primary selection:text-black">
      
      {/* Background Decorative Elements - Matching Hero.tsx style */}
      <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-primary rounded-full opacity-10 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-[400px] h-[400px] bg-primary-alt rounded-full opacity-5 blur-2xl pointer-events-none" />
      
      {/* Carbon Fibre Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-6xl z-10 flex flex-col items-center"
      >
        <header className="text-center mb-16 max-w-4xl">
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-6 py-2 border-2 border-primary text-primary rounded-full text-xs font-black uppercase tracking-[0.2em] mb-10 bg-black"
          >
            <Sparkles size={16} /> Logic Lab Platform
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] mb-8 uppercase"
          >
            {t("welcome.pick_a")} <br />
            <span className="text-primary drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              {t("welcome.pick_b")}
            </span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-2xl text-white font-bold max-w-2xl mx-auto leading-snug opacity-80 border-l-8 border-primary pl-8 text-left md:text-center md:border-l-0 md:pl-0"
          >
            {t("welcome.intro")}
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mb-24">
          {/* MODERN / AI MODE CARD */}
          <motion.button
            variants={itemVariants}
            whileHover={{ y: -12, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('modern')}
            className="group relative p-12 bg-[#2a2a2a] border-2 border-white/5 rounded-[2rem] text-left flex flex-col items-start shadow-2xl hover:border-primary transition-all duration-500 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500" />
            
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-black border-2 border-primary text-primary flex items-center justify-center mb-10 group-hover:bg-primary group-hover:text-black transition-all duration-500 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
              <Bot size={40} strokeWidth={2.5} />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase text-white">{t("welcome.ai_title")}</h2>
              <p className="text-white opacity-60 mb-12 text-lg leading-relaxed font-medium">
                {t("welcome.ai_desc")}
              </p>

              <div className="flex items-center gap-4 text-primary font-black text-sm uppercase tracking-widest group-hover:gap-6 transition-all duration-300">
                {t("welcome.ai_cta")}
                <ArrowRight size={24} />
              </div>
            </div>

            <div className="absolute -bottom-8 -right-8 text-primary opacity-5 transform rotate-12 group-hover:scale-110 transition-transform duration-700">
              <Zap size={160} strokeWidth={1} />
            </div>
          </motion.button>

          {/* TRADITIONAL MODE CARD */}
          <motion.button
            variants={itemVariants}
            whileHover={{ y: -12, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('traditional')}
            className="group relative p-12 bg-[#2a2a2a] border-2 border-white/5 rounded-[2rem] text-left flex flex-col items-start shadow-2xl hover:border-white transition-all duration-500 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500" />
            
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-black border-2 border-white/20 text-white flex items-center justify-center mb-10 group-hover:bg-white group-hover:text-black transition-all duration-500">
              <Navigation size={40} strokeWidth={2.5} />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase text-white">{t("welcome.classic_title")}</h2>
              <p className="text-white opacity-60 mb-12 text-lg leading-relaxed font-medium">
                {t("welcome.classic_desc")}
              </p>

              <div className="flex items-center gap-4 text-white font-black text-sm uppercase tracking-widest group-hover:gap-6 transition-all duration-300">
                {t("welcome.classic_cta")}
                <ArrowRight size={24} />
              </div>
            </div>

            <div className="absolute -bottom-8 -right-8 text-white opacity-5 transform -rotate-12 group-hover:scale-110 transition-transform duration-700">
              <Layout size={160} strokeWidth={1} />
            </div>
          </motion.button>
        </div>

        {/* Branding Features */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-12 w-full max-w-4xl"
        >
          {[
            { icon: <Home size={24} />, label: "Your Space" },
            { icon: <Heart size={24} />, label: "Personalized" },
            { icon: <Coffee size={24} />, label: "Easy Start" },
            { icon: <Zap size={24} />, label: "Fast Path" }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4 group cursor-default">
              <div className="w-14 h-14 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center text-primary group-hover:border-primary group-hover:scale-110 transition-all duration-300">
                {item.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white opacity-40 group-hover:opacity-100 transition-opacity">
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Floating Help Button - Integrated Style */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5, type: 'spring' }}
        className="fixed bottom-10 right-10 z-[50]"
      >
        <button
          onClick={() => setShowGuide(true)}
          className="group relative w-16 h-16 bg-primary text-black rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:scale-110 active:scale-95 transition-all duration-300"
        >
          <HelpCircle size={32} strokeWidth={2.5} />
          <span className="absolute right-full mr-6 bg-black border-2 border-primary text-primary text-[10px] font-black uppercase py-2 px-4 rounded-lg tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {t("welcome.help_label")}
          </span>
        </button>
      </motion.div>

      <AnimatePresence>
        {showGuide && <InteractiveGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default WelcomePage;