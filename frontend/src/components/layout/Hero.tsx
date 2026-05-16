import React from 'react';
import Container from './Container';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useState, useEffect } from "react";

const roles = [
  { slug: 'ml', lines: ['ML', 'ENGINEER'] },
  { slug: 'photography', lines: ['ՊՐՈՖԵՍԻՈՆԱԼ', 'ԼՈւՍԱՆԿԱՐԻՉ'] },
  { slug: '3dsmax', lines: ['3D', 'ԴԻԶԱՅՆԵՐ'] },
  { slug: 'web', lines: ['WEB', 'DEVELOPER'] },
];

function AnimatedRole() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % roles.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const role = roles[current];

  return (
    <h1
      onClick={() => navigate(`/courses/${role.slug}`)}
      className="text-hero font-black leading-[0.85] uppercase transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-95 pl-8 text-foreground"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}
    >
      {role.lines.map((line, i) =>
        i === role.lines.length - 1 ? (
          <span
            key={i}
            className="block drop-shadow-[4px_4px_0px_hsl(var(--surface-1))]"
            style={{ color: 'hsl(var(--accent-strong))' }}
          >
            {line}
          </span>
        ) : (
          <span key={i} className="block">{line}</span>
        )
      )}
    </h1>
  );
}

const Hero: React.FC = () => {
  return (
    <div
      className="relative min-h-[90vh] flex items-center overflow-hidden"
      style={{ background: 'hsl(var(--surface-1))' }}
    >
      {/* Background depth — soft accent halos echo the brand without
          competing with the headline. */}
      <div
        className="absolute -right-40 -top-40 w-[800px] h-[800px] rounded-full opacity-80 animate-pulse"
        style={{ background: 'hsl(var(--accent-strong))' }}
      />
      <div
        className="absolute -left-20 -bottom-20 w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: 'hsl(var(--text-primary))' }}
      />

      <Container className="relative z-10 py-20">
        <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">

          <span className="inline-block text-foreground font-black text-xl uppercase tracking-widest animate-bounce">
            ԱՐԻ՜ ԴԱՌՆԱԼՈւ
          </span>
          <AnimatedRole />

          <p
            className="text-foreground text-xl md:text-2xl font-bold max-w-1xl leading-snug opacity-95 pl-8"
            style={{ borderLeft: '8px solid hsl(var(--surface-1))' }}
          >
            Ստեղծիր ապագան այսօր։ Միացիր LogicLab-ին և տիրապետիր աշխարհի ամենապահանջված մասնագիտություններին
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <button
              onClick={() => (window.location.href = "/register")}
              className="text-foreground pl-0 pr-10 py-4 rounded-2xl font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-4 group"
            >
              Գրանցվել հիմա
              <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </Container>

      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
    </div>
  );
};

export default Hero;
