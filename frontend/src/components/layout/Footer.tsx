import React from 'react';
import Container from './Container';
import { Bot, Layout } from 'lucide-react';
import { 
  FaFacebookF, 
  FaInstagram, 
  FaLinkedinIn, 
  FaTelegramPlane 
} from 'react-icons/fa';
import { useNavigationMode } from '../../hooks/useNavigationMode';

const Footer: React.FC = () => {
  const { mode, selectMode } = useNavigationMode();

const socialLinks = [
  { 
    Icon: FaFacebookF, 
    href: 'https://www.facebook.com/LogicLabruary',
    label: 'Facebook'
  },
  { 
    Icon: FaInstagram,
    href: 'https://www.instagram.com/logic_lab_academy/',
    label: 'Instagram'
  },
  { 
    Icon: FaLinkedinIn,
    href: 'https://www.linkedin.com/company/logiclabacademy/',
    label: 'LinkedIn'
  },
  { 
    Icon: FaTelegramPlane, 
    href: 'https://t.me/logiclabacademy',
    label: 'Telegram'
  },
];

  return (
    <footer className="relative bg-black border-t border-gray-dark pt-[100px] pb-[60px]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          
          {/* Brand Section */}
          <div className="md:col-span-2 space-y-8">
            <h2 className="text-4xl font-black text-primary">LOGIC LAB ACADEMY</h2>
            <p className="text-[var(--gray-light)] opacity-70 max-w-md text-lg leading-relaxed">
              Ապագայի կրթական հարթակ, որտեղ արհեստական բանականությունը և տեխնոլոգիաները դառնում են հասանելի բոլորին:
            </p>
            
            {/* Social Links Container */}
            <div className="flex items-center gap-4">
              {socialLinks.map(({ Icon, href, label }) => (
                <a 
                  key={label} 
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  /* Added 'relative z-10' and 'cursor-pointer' to ensure clickability */
                  className="relative z-10 w-12 h-12 bg-gray-dark rounded-xl flex items-center justify-center text-white hover:bg-primary hover:text-primary-alt transition-all duration-300 shadow-lg cursor-pointer"
                >
                  <Icon size={22} className="pointer-events-none" />
                </a>
              ))}
            </div>
          </div>

          {/* Useful Links Section */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-primary-alt border-l-4 border-primary pl-4">ՕԳՏԱԿԱՐ ՀՂՈՒՄՆԵՐ</h4>
            <ul className="space-y-4 text-[var(--gray-light)] font-semibold">
              <li><a href="/about" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">Մեր Մասին</a></li>
              <li><a href="/courses" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">Դասընթացներ</a></li>
              <li><a href="/#instructors" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">Դասախոսներ</a></li>
              <li><a href="/#projects" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">Նախագծեր</a></li>
            </ul>
          </div>

          {/* Navigation Mode Section */}
          {/* <div className="space-y-6">
            <h4 className="text-xl font-bold text-primary-alt border-l-4 border-primary pl-4">ՆԱՎԻԳԱՑԻԱՅԻ ՌԵԺԻՄ</h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => selectMode('modern')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                  mode === 'modern'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-transparent text-[var(--gray-light)] opacity-50 border-gray-dark hover:border-primary hover:opacity-100'
                }`}
              >
                <Bot size={18} />
                Logic AI
              </button>
              <button
                onClick={() => selectMode('traditional')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                  mode === 'traditional'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-transparent text-[var(--gray-light)] opacity-50 border-gray-dark hover:border-primary hover:opacity-100'
                }`}
              >
                <Layout size={18} />
                Ավանդական
              </button>
            </div>
          </div> */}
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-gray-dark flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-mono tracking-widest uppercase opacity-40">
            © 2026 LOGIC LAB ACADEMY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-8 text-xs font-mono uppercase tracking-widest opacity-40">
            <a href="#" className="hover:text-primary-alt hover:opacity-100 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary-alt hover:opacity-100 transition-colors">Terms of Service</a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;