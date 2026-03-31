import React from 'react';
import { Bot, Layout } from 'lucide-react';
import { useNavigationMode } from '../../hooks/useNavigationMode';
import { motion } from 'framer-motion';

const NavigationModeSwitcher: React.FC = () => {
  const { mode, selectMode } = useNavigationMode();

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-dark/50 backdrop-blur-md border border-white/5 rounded-2xl">
      <button
        onClick={() => selectMode('modern')}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
          mode === 'modern' ? 'text-black' : 'text-white/40 hover:text-white'
        }`}
      >
        {mode === 'modern' && (
          <motion.div
            layoutId="mode-bg"
            className="absolute inset-0 bg-primary rounded-xl"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Bot size={16} className="relative z-10" />
        <span className="relative z-10 hidden sm:inline">Modern AI</span>
      </button>

      <button
        onClick={() => selectMode('traditional')}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
          mode === 'traditional' ? 'text-black' : 'text-white/40 hover:text-white'
        }`}
      >
        {mode === 'traditional' && (
          <motion.div
            layoutId="mode-bg"
            className="absolute inset-0 bg-primary rounded-xl"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Layout size={16} className="relative z-10" />
        <span className="relative z-10 hidden sm:inline">Traditional</span>
      </button>
    </div>
  );
};

export default NavigationModeSwitcher;
