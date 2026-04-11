import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BrainCircuit, Box, Camera, Zap,
  Target, Lightbulb, Heart,
  TrendingUp, Users, GraduationCap, Award,
  MapPin, Monitor, BookOpen,
} from "lucide-react";
import Container from "../components/layout/Container";
import InstructorsSection from "@/components/InstructorsSection";

/* ── DATA ──────────────────────────────────────────────────── */

const stats = [
  { icon: TrendingUp,    value: "100%",      label: "Գործնական ուսուցում" },
  { icon: Users,         value: "3+",        label: "Ոլորտներ" },
  { icon: GraduationCap, value: "Դպրոցական", label: "և սկսնակների համար" },
  { icon: Award,         value: "TOP",       label: "Մրցունակ հմտություններ" },
];

const courses = [
  {
    icon: BrainCircuit,
    title: "AI & ML",
    desc: "Տիրապետեք Python-ին և արհեստական բանականության հիմունքներին:",
    tag: "Պահանջված",
  },
  {
    icon: Box,
    title: "3D Մոդելավորում",
    desc: "3ds Max վիզուալիզացիա և թվային աշխարհների ստեղծում:",
    tag: "Ստեղծագործական",
  },
  {
    icon: Camera,
    title: "Լուսանկարչություն",
    desc: "Էքսպոզիցիայի հիմունքներից մինչև պրոֆեսիոնալ Photoshop:",
    tag: "Արվեստ",
  },
  {
    icon: Zap,
    title: "Գործնական Փորձ",
    desc: "Իրական նախագծեր և անմիջապես կիրառելի գիտելիքներ:",
    tag: "Կիրառական",
  },
];

const audiences = [
  {
    icon: Target,
    title: "Դպրոցականներ",
    desc: "Ովքեր ցանկանում են ձեռք բերել մրցունակ մասնագիտություն վաղ տարիքից:",
  },
  {
    icon: Lightbulb,
    title: "Սկսնակներ",
    desc: "Ովքեր ցանկանում են հիմնարար կերպով խորացնել իրենց գիտելիքները:",
  },
  {
    icon: Heart,
    title: "Բոլորը",
    desc: "Ովքեր ձգտում են տիրապետել նոր ու ժամանակակից մասնագիտությունների:",
  },
];

const formats = [
  { icon: MapPin,   label: "Առկա",    sub: "Վանաձոր" },
  { icon: Monitor,  label: "Առցանց",  sub: "Zoom / Teams" },
  { icon: BookOpen, label: "Հիբրիդ",  sub: "Ձեր ընտրությամբ" },
];

/* ── HELPERS ───────────────────────────────────────────────── */

const FadeIn = ({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "none";
}) => {
  const yMap = { up: 24, left: 0, right: 0, none: 0 };
  const xMap = { up: 0, left: -24, right: 24, none: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, y: yMap[direction], x: xMap[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-[var(--primary-alt)] font-mono font-bold text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-3">
    {children}
  </span>
);

/* ── PAGE ──────────────────────────────────────────────────── */

const AboutPage = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector<HTMLElement>(hash);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [hash]);

  return (
  <div className="bg-[var(--black)] text-[var(--white)] overflow-x-hidden">

    {/* ── HERO ─────────────────────────────────────────────── */}
    <section className="relative bg-[var(--primary)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--white) 1px,transparent 1px),linear-gradient(90deg,var(--white) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <Container>
        <div className="relative py-20 sm:py-28 lg:py-36 max-w-4xl">
          <FadeIn direction="none">
            <span className="inline-block text-[var(--white)]/70 font-mono font-bold text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-6">
              Logic Lab — Մտածիր Խորը. Ստեղծի՛ր Վառ
            </span>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-[var(--primary-alt)] text-5xl sm:text-7xl lg:text-9xl font-black uppercase leading-[0.88] tracking-tighter mb-8">
              ՄԵՐ<br />ՄԱՍԻՆ
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-[var(--white)] text-lg sm:text-xl lg:text-2xl font-bold leading-snug max-w-xl opacity-90">
              Logic Lab-ը միավորում է տրամաբանությունն ու ստեղծագործությունը,
              գիտությունն ու արվեստը՝ կերտելով թվային ապագա։
            </p>
          </FadeIn>

          {/* Format pills */}
          <FadeIn delay={0.3}>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-8">
              {formats.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 bg-[var(--white)]/10 border border-[var(--white)]/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2"
                >
                  <f.icon className="w-3.5 h-3.5 text-[var(--primary-alt)] flex-shrink-0" />
                  <span className="text-[var(--white)] text-[10px] sm:text-xs font-black uppercase tracking-wider">
                    {f.label}
                  </span>
                  <span className="text-[var(--white)]/50 text-[10px] sm:text-xs hidden sm:inline">
                    · {f.sub}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>

    {/* ── STATS ────────────────────────────────────────────── */}
    <section className="border-b border-[var(--gray-dark)]">
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--gray-dark)]">
          {stats.map((s, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="flex flex-col items-center gap-2 py-8 px-4 sm:px-6 text-center">
                <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--primary-alt)]" />
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--primary)] leading-none">
                  {s.value}
                </div>
                <div className="text-[9px] sm:text-[10px] text-[var(--gray-light)]/50 uppercase tracking-[0.15em] font-black leading-tight max-w-[100px]">
                  {s.label}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>

    {/* ── MISSION ──────────────────────────────────────────── */}
    <section className="py-16 sm:py-24 lg:py-32">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — text */}
          <FadeIn direction="left">
            <SectionLabel>Ինչո՞ւ ընտրել Logic Lab-ը</SectionLabel>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-[0.92] mb-6 text-[var(--white)]">
              ԾՐԱԳՐԱՎՈՐԻ՛Ր<br />
              <span className="text-[var(--primary)]">ՄՏԱԾՈՂՈՒԹՅՈՒՆԴ</span>
            </h2>
            <div className="space-y-4 text-[var(--gray-light)]/70 text-base sm:text-lg font-medium leading-relaxed">
              <p>
                Մենք առաջարկում ենք դասընթացներ Արհեստական բանականության,
                3D մոդելավորման և Լուսանկարչության ոլորտներում: Մեզ մոտ դուք
                կսովորեք ոչ միայն տեխնիկական հմտություններ, այլև թվային
                աշխարհներ ձևավորելու արվեստը:
              </p>
              <p className="text-[var(--primary-alt)] font-black text-sm uppercase tracking-[0.2em]">
                📍 Վանաձոր · Առցանց · Առկա
              </p>
            </div>
          </FadeIn>

          {/* Right — 2×2 course cards */}
          <div className="grid sm:grid-cols-2 gap-3">
            {courses.map((c, i) => (
              <FadeIn key={c.title} delay={i * 0.08}>
                <div className="group h-full bg-[var(--gray-dark)] border border-transparent hover:border-[var(--primary-alt)]/40 rounded-2xl p-5 transition-all duration-300 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                      <c.icon className="w-5 h-5 text-[var(--primary-alt)]" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--primary-alt)] bg-[var(--primary)]/20 border border-[var(--primary-alt)]/20 rounded-full px-2.5 py-1 leading-none mt-0.5 flex-shrink-0 whitespace-nowrap">
                      {c.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-[var(--white)] uppercase tracking-tight leading-tight">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[var(--gray-light)]/60 font-medium leading-relaxed flex-1">
                    {c.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

        </div>
      </Container>
    </section>

    {/* ── AUDIENCES ────────────────────────────────────────── */}
    <section className="py-16 sm:py-24 bg-[var(--gray-dark)]/30">
      <Container>
        <FadeIn className="mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-tight">
            <span className="text-[var(--primary-alt)]">Ո՞ՒՄ ՀԱՄԱՐ ԵՆ </span>
            <span className="text-[var(--white)]">ԴԱՍԸՆԹԱՑՆԵՐԸ</span>
          </h2>
        </FadeIn>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {audiences.map((a, i) => (
            <FadeIn key={a.title} delay={i * 0.1}>
              <div className="group bg-[var(--black)] border border-[var(--gray-dark)] hover:border-[var(--primary)]/60 rounded-2xl p-6 sm:p-8 h-full flex flex-col gap-4 transition-all duration-300">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--gray-dark)] flex items-center justify-center text-[var(--primary-alt)] flex-shrink-0">
                  <a.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-[var(--white)] uppercase tracking-tight leading-tight">
                  {a.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-[var(--gray-light)]/60 font-medium leading-relaxed flex-1">
                  {a.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>

    {/* ── INSTRUCTORS ──────────────────────────────────────── */}
    <section id="instructors" className="py-16 sm:py-24 lg:py-32">
      <Container>
        <InstructorsSection />
      </Container>
    </section>

  </div>
  );
};

export default AboutPage;