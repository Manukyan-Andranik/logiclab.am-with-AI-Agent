import React from 'react';
import Container from './Container';
import { Facebook, Instagram, Twitter, Linkedin, Github, Settings, Bot, Layout } from 'lucide-react';
import { useNavigationMode } from '../../hooks/useNavigationMode';

const Footer: React.FC = () => {
  const { mode, selectMode } = useNavigationMode();

  return (
    <footer className="bg-[var(--black)] border-t border-[var(--gray-dark)] pt-[100px] pb-[60px]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="md:col-span-2 space-y-8">
            <h2 className="text-4xl font-black text-[var(--primary)]">LOGIC LAB ACADEMY</h2>
            <p className="text-[var(--gray-light)] opacity-70 max-w-md text-lg leading-relaxed">
              Ապագայի կրթական հարթակ, որտեղ արհեստական բանականությունը և տեխնոլոգիաները դառնում են հասանելի բոլորին:
            </p>
            <div className="flex items-center gap-4">
              {[Facebook, Instagram, Twitter, Linkedin, Github].map((Icon, idx) => (
                <a 
                  key={idx} 
                  href="#" 
                  className="w-12 h-12 bg-[var(--gray-dark)] rounded-xl flex items-center justify-center text-[var(--white)] hover:bg-[var(--primary)] hover:text-[var(--black)] transition-[var(--transition)] shadow-lg"
                >
                  <Icon size={22} />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-xl font-bold text-[var(--primary-alt)] border-l-4 border-[var(--primary)] pl-4">ՕԳՏԱԿԱՐ ՀՂՈՒՄՆԵՐ</h4>
            <ul className="space-y-4 text-[var(--gray-light)] opacity-70 font-semibold">
              <li><a href="/about" className="hover:text-[var(--primary)] transition-[var(--transition)]">Մեր Մասին</a></li>
              <li><a href="/courses" className="hover:text-[var(--primary)] transition-[var(--transition)]">Դասընթացներ</a></li>
              <li><a href="/#instructors" className="hover:text-[var(--primary)] transition-[var(--transition)]">Դասախոսներ</a></li>
              <li><a href="/#projects" className="hover:text-[var(--primary)] transition-[var(--transition)]">Նախագծեր</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-xl font-bold text-[var(--primary-alt)] border-l-4 border-[var(--primary)] pl-4">ՆԱՎԻԳԱՑԻԱՅԻ ՌԵԺԻՄ</h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => selectMode('modern')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${mode === 'modern'
                    ? 'bg-[var(--primary)] text-[var(--white)] border-[var(--primary)] shadow-[0_0_20px_rgba(255,215,0,0.2)]'
                    : 'bg-transparent text-[var(--gray-light)] opacity-50 border-[var(--gray-dark)] hover:border-[var(--primary)] hover:opacity-100'
                  }`}
              >
                <Bot size={18} />
                Logic AI
              </button>
              <button
                onClick={() => selectMode('traditional')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${mode === 'traditional'
                    ? 'bg-[var(--primary)] text-[var(--white)] border-[var(--primary)] shadow-[0_0_20px_rgba(255,215,0,0.2)]'
                    : 'bg-transparent text-[var(--gray-light)] opacity-50 border-[var(--gray-dark)] hover:border-[var(--primary)] hover:opacity-100'
                  }`}
              >
                <Layout size={18} />
                Ավանդական
              </button>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-[var(--gray-dark)] flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
          <p className="text-xs font-mono tracking-widest uppercase">
            © 2026 LOGIC LAB ACADEMY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-8 text-xs font-mono uppercase tracking-widest">
            <a href="#" className="hover:text-[var(--primary-alt)] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[var(--primary-alt)] transition-colors">Terms of Service</a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
