import React from 'react';
import { Bot, Layout, ArrowRight, Sparkles, Navigation } from 'lucide-react';
import { NavigationMode } from '../../hooks/useNavigationMode';

interface WelcomePageProps {
  onSelect: (mode: NavigationMode) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-[var(--black)] flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="max-w-5xl w-full">
        {/* Header Section */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--gray-dark)] border border-[var(--primary)]/20 mb-4">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-[10px] font-mono text-[var(--primary)] uppercase tracking-[0.2em]">
              Welcome to Logic Lab
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-[var(--white)] tracking-tighter">
            How would you like to <br />
            <span className="text-[var(--primary)]">use the platform?</span>
          </h1>
          <p className="text-[var(--gray-light)] opacity-60 max-w-2xl mx-auto text-lg">
            Choose your preferred way to navigate and interact with our ecosystem. 
            You can always change this later in settings.
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Option 1: Modern AI */}
          <button
            onClick={() => onSelect('modern')}
            className="group relative flex flex-col p-8 rounded-3xl bg-[var(--gray-dark)] border-2 border-transparent hover:border-[var(--primary)] transition-all duration-500 text-left overflow-hidden shadow-2xl"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[var(--primary)]/10 blur-[100px] rounded-full group-hover:bg-[var(--primary)]/20 transition-colors" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)] text-[var(--black)] flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,215,0,0.3)] group-hover:scale-110 transition-transform">
                <Bot size={32} />
              </div>

              <h3 className="text-2xl font-black text-[var(--white)] mb-4">
                Modern AI Navigation
              </h3>
              
              <p className="text-[var(--gray-light)] opacity-60 mb-8 flex-grow">
                Interact using natural language. Our Logic Agent interprets your requests and navigates you automatically.
              </p>

              <ul className="space-y-3 mb-10">
                {[
                  'Prompt-based interaction',
                  'Intelligent context awareness',
                  'Minimalist, distraction-free UI',
                  'Automated navigation'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-[var(--white)]/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-3 text-[var(--primary)] font-black uppercase tracking-widest text-sm group-hover:gap-5 transition-all">
                Use Modern AI Navigation
                <ArrowRight size={18} />
              </div>
            </div>
          </button>

          {/* Option 2: Traditional UI */}
          <button
            onClick={() => onSelect('traditional')}
            className="group relative flex flex-col p-8 rounded-3xl bg-[var(--black)] border-2 border-[var(--gray-dark)] hover:border-[var(--primary)] transition-all duration-500 text-left overflow-hidden shadow-2xl"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[var(--white)]/5 blur-[100px] rounded-full group-hover:bg-[var(--primary)]/10 transition-colors" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 rounded-2xl bg-[var(--gray-dark)] text-[var(--white)] flex items-center justify-center mb-8 border border-[var(--gray-dark)] group-hover:bg-[var(--primary)] group-hover:text-[var(--black)] transition-colors">
                <Navigation size={32} />
              </div>

              <h3 className="text-2xl font-black text-[var(--white)] mb-4">
                Traditional Navigation
              </h3>
              
              <p className="text-[var(--gray-light)] opacity-60 mb-8 flex-grow">
                Classic interface with standard menus and buttons. Navigate manually through our structured categories.
              </p>

              <ul className="space-y-3 mb-10">
                {[
                  'Standard top/sidebar menus',
                  'Visual interface controls',
                  'Predictable user experience',
                  'Direct manual access'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-[var(--white)]/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--gray-light)] opacity-30" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-3 text-[var(--gray-light)] group-hover:text-[var(--primary)] font-black uppercase tracking-widest text-sm group-hover:gap-5 transition-all">
                Use Traditional Navigation
                <ArrowRight size={18} />
              </div>
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-center mt-12 text-[10px] text-[var(--gray-light)] opacity-30 font-mono uppercase tracking-[0.3em]">
          Powered by Logic OS v4.0.2 • System Ready
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;
