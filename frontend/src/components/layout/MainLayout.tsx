import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import LogicAgent from '../logic/LogicAgent';
import Footer from './Footer';

const MainLayout: React.FC = () => {
  const [isAgentOpen, setIsAgentOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--black)] transition-[var(--transition)]">
      {/* Primary Navigation via AI Agent */}
      <LogicAgent isOpen={isAgentOpen} setIsOpen={setIsAgentOpen} />

      {/* Main Content Area - Space allocated for Agent on Desktop if open */}
      <main 
        className={`flex-1 transition-[padding_0.3s_cubic-bezier(0.25,0.8,0.25,1)] pl-0 ${
          isAgentOpen ? 'md:pl-[420px]' : 'md:pl-0'
        }`}
      >
        {/* Dynamic Page Content */}
        <Outlet />
      </main>

      {/* Footer also moved to content area to align with padding */}
      <div 
        className={`transition-[padding_0.3s_cubic-bezier(0.25,0.8,0.25,1)] pl-0 ${
          isAgentOpen ? 'md:pl-[420px]' : 'md:pl-0'
        }`}
      >
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
