import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from './Container';
import { Bot, Layout } from 'lucide-react';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTelegramPlane
} from 'react-icons/fa';
import { useNavigationMode } from '../../hooks/useNavigationMode';
import { useNavigationContext } from './NavigationProvider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FooterProps {
  navigationSystem?: 'AGENT' | 'TRADITIONAL' | null;
}

const Footer: React.FC<FooterProps> = ({ navigationSystem }) => {
  const { mode, selectMode } = useNavigationMode();
  const { navigationSystem: configNavigationSystem } = useNavigationContext();
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);

  // Use passed prop or context value
  const system = navigationSystem || configNavigationSystem;

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

  const handleNavigationModeChange = (newMode: 'modern' | 'traditional') => {
    // If in TRADITIONAL mode, show "Coming Soon" message
    if (system === 'TRADITIONAL') {
      setShowComingSoonDialog(true);
      return;
    }

    // In AGENT mode, allow switching
    selectMode(newMode);
  };

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
              <li>
                <Link to="/" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">
                  Գլխավոր
                </Link>
              </li>
              <li>
                <Link to="/courses#all" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">
                  Դասընթացներ
                </Link>
              </li>
              <li>
                <Link to="/about" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">
                  Մեր Մասին
                </Link>
              </li>
              <li>
                <Link to="/about#instructors" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">
                  Դասախոսներ
                </Link>
              </li>
              <li>
                <Link to="/#projects" className="opacity-70 hover:opacity-100 hover:text-primary transition-all">
                  Նախագծեր
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Mode Section */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-primary-alt border-l-4 border-primary pl-4">ՆԱՎԻԳԱՑԻԱՅԻ ՌԵԺԻՄ</h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleNavigationModeChange('modern')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${mode === 'modern'
                  ? 'bg-[#FFD700] text-[var(--black)] border-[#FFD700]'
                  : 'bg-transparent text-[var(--gray-light)] opacity-50 border-gray-dark hover:border-[#FFD700] hover:opacity-100'
                  }`}
              >
                <Bot size={18} />
                LogicAI Agent
              </button>
              <button
                onClick={() => handleNavigationModeChange('traditional')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${mode === 'traditional'
                  ? 'bg-[#FFD700] text-[var(--black)] border-[#FFD700]'
                  : 'bg-transparent text-[var(--gray-light)] opacity-50 border-gray-dark hover:border-[#FFD700] hover:opacity-100'
                  }`}
              >
                <Layout size={18} />
                Traditional
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-gray-dark flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-mono tracking-widest uppercase opacity-40">
            © 2026 LOGIC LAB ACADEMY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-8 text-xs font-mono uppercase tracking-widest opacity-40">
            <Link to="/privacy-policy" className="hover:text-primary-alt hover:opacity-100 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-primary-alt hover:opacity-100 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </Container>

      {/* "Coming Soon" Dialog for Traditional Mode */}
      <AlertDialog open={showComingSoonDialog} onOpenChange={setShowComingSoonDialog}>
        <AlertDialogContent className="bg-gray-dark border border-gray-dark"> {/* changed from bg-black */}
          <AlertDialogTitle className="text-[#FFC000]">Շուտով հասանելի կլինի</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--gray-light)]">
            Navigation համակարգի փոփոխումը այս պահին հասանելի չէ։ Այս հնարավորությունը կավելացվի առաջիկա թարմացումներում։ Ներկայում դուք օգտագործում եք Traditional նավիգացիոն համակարգը։
          </AlertDialogDescription>
          <AlertDialogAction
            onClick={() => setShowComingSoonDialog(false)}
            className="w-fit px-6 py-3 rounded-xl bg-[#FFC000] hover:bg-[#FFD700] text-[#222] text-sm font-semibold uppercase tracking-wide transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2"
          >
            Հասկացա
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </footer>
  );
};

export default Footer;