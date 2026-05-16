import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import LogicAgent from '../logic/LogicAgent';
import Footer from './Footer';
import TraditionalNavbar from './TraditionalNavbar';
import WelcomePage from './WelcomePage';
import ScrollToTop from './ScrollToTop';
import ScrollToTopButton from './ScrollToTopButton';
import { useNavigationMode } from '../../hooks/useNavigationMode';
import { useNavigationContext } from './NavigationProvider';
import { usePageViewTracker } from '../../hooks/usePageViewTracker';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout: React.FC = () => {
  const { mode, selectMode } = useNavigationMode();
  const { navigationSystem, isConfigLoading } = useNavigationContext();
  const [isAgentOpen, setIsAgentOpen] = useState(true);
  usePageViewTracker();

  // Show loading state while config is being fetched
  if (isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // In TRADITIONAL mode, show WelcomePage if no mode is selected yet
  // In AGENT mode, also show WelcomePage if no mode is selected
  // But in TRADITIONAL mode, don't actually show the selection buttons
  if (mode === null && navigationSystem === 'AGENT') {
    return <WelcomePage onSelect={selectMode} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black transition-all duration-300 overflow-x-hidden relative">
      <ScrollToTop />
      
      <AnimatePresence mode="wait">
        {mode === 'modern' && navigationSystem === 'AGENT' ? (
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

      {/* Main Content Area
       *
       * No AnimatePresence wrapper around <Outlet />. The previous
       * `mode="wait"` page-transition kept the OLD route mounted for ~300ms
       * (exit animation) before the new route mounted with its own 300ms
       * enter. Combined with framer-motion `<FadeIn>` wrappers inside pages
       * like RegisterPage (further 600ms+ staggered fades), navigating from
       * a tall page (e.g. CourseDetailPage) to a short one (e.g.
       * RegisterPage) produced a perceived "blank page" for ~1s — users
       * thought it was broken and refreshed to force a paint. Routes now
       * swap instantly; ScrollToTop resets scroll synchronously in a
       * useLayoutEffect; per-page entry animations still run as before.
       */}
      <main
        className={`flex-1 transition-[padding_0.5s_cubic-bezier(0.25,0.8,0.25,1)] pl-0 ${
          mode === 'modern' && isAgentOpen && navigationSystem === 'AGENT' ? 'md:pl-[420px]' : 'md:pl-0'
        } ${mode === 'traditional' || navigationSystem === 'TRADITIONAL' ? 'pt-24' : ''}`}
      >
        <Outlet />
      </main>

      {/* Footer also moved to content area to align with padding */}
      <div 
        className={`transition-[padding_0.5s_cubic-bezier(0.25,0.8,0.25,1)] pl-0 ${
          mode === 'modern' && isAgentOpen && navigationSystem === 'AGENT' ? 'md:pl-[420px]' : 'md:pl-0'
        }`}
      >
        <Footer navigationSystem={navigationSystem} />
      </div>

      {/* Global Floating Elements */}
      <ScrollToTopButton />
    </div>
  );
};

export default MainLayout;
