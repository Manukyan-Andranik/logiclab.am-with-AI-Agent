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
      className="text-[var(--white)] text-5xl md:text-6xl lg:text-8xl font-black leading-[0.85] tracking-tighter uppercase transition-all duration-400 cursor-pointer hover:scale-[1.02] active:scale-95 pl-8"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}
    >
      {role.lines.map((line, i) =>
        i === role.lines.length - 1 ? (
          <span key={i} className="block text-[var(--primary-alt)] drop-shadow-[4px_4px_0px_var(--black)]">
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
    <div className="relative min-h-[90vh] flex items-center bg-[var(--primary)] overflow-hidden transition-[var(--transition)]">
      {/* Decorative Tilda-style large background circles - SOLID SHAPES */}
      <div className="absolute -right-40 -top-40 w-[800px] h-[800px] bg-[var(--primary-alt)] rounded-full opacity-80 animate-pulse"></div>
      <div className="absolute -left-20 -bottom-20 w-[400px] h-[400px] bg-[var(--white)] rounded-full opacity-10"></div>

      {/* Container with the grid feel */}
      <Container className="relative z-10 py-20">
        <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">


          <span className="inline-block text-[var(--white)] font-black text-xl uppercase tracking-widest animate-bounce">
            ԱՐԻ՜ ԴԱՌՆԱԼՈւ
          </span>
          <AnimatedRole />

          <p className="text-[var(--white)] text-xl md:text-2xl font-bold max-w-1xl leading-snug opacity-95 border-l-8 border-[var(--black)] pl-8">
            Ստեղծիր ապագան այսօր։ Միացիր LogicLab-ին և տիրապետիր աշխարհի ամենապահանջված մասնագիտություններին
          </p>

          <div className=" flex-col sm:row gap-6">
            <button
              onClick={() => (window.location.href = "/register")}
              className="text-[var(--white)] pl-0 pr-10 py-4 rounded-2xl font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-[var(--transition)] flex items-center justify-center gap-4 group"
            >
              Գրանցվել հիմա
              <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </Container>

      {/* Futuristic Grid Overlay & Textures from Tilda */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
    </div>
  );
};

export default Hero;
