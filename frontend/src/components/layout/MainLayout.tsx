import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LogicAgent from '../logic/LogicAgent';
import Footer from './Footer';
import TraditionalNavbar from './TraditionalNavbar';
import WelcomePage from './WelcomePage';
import { useNavigationMode } from '../../hooks/useNavigationMode';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout: React.FC = () => {
  const { mode, selectMode } = useNavigationMode();
  const [isAgentOpen, setIsAgentOpen] = useState(true);
  const location = useLocation();

  // If mode is not selected yet, show WelcomePage
  if (mode === null) {
    return <WelcomePage onSelect={selectMode} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--black)] transition-[var(--transition)] overflow-x-hidden">
      <AnimatePresence mode="wait">
        {mode === 'modern' ? (
          <motion.div
            key="modern-nav"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Primary Navigation via AI Agent */}
            <LogicAgent isOpen={isAgentOpen} setIsOpen={setIsAgentOpen} />
          </motion.div>
        ) : (
          <motion.div
            key="traditional-nav"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <TraditionalNavbar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main 
        className={`flex-1 transition-[padding_0.5s_cubic-bezier(0.25,0.8,0.25,1)] pl-0 ${
          mode === 'modern' && isAgentOpen ? 'md:pl-[420px]' : 'md:pl-0'
        } ${mode === 'traditional' ? 'pt-24' : ''}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Dynamic Page Content */}
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer also moved to content area to align with padding */}
      <div 
        className={`transition-[padding_0.5s_cubic-bezier(0.25,0.8,0.25,1)] pl-0 ${
          mode === 'modern' && isAgentOpen ? 'md:pl-[420px]' : 'md:pl-0'
        }`}
      >
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
