import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BrainCircuit, Box, Camera, Zap,
  Target, Lightbulb, Heart,
  TrendingUp, Users, GraduationCap, Award,
  MapPin, Monitor, BookOpen, ArrowRight,
} from "lucide-react";
import Container from "../components/layout/Container";
import InstructorsSection from "@/components/InstructorsSection";
import { useT } from "@/i18n";

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

/* Eyebrow label — a leading dot anchors the eye and signals a new section.
 * Used above every h2 for consistent rhythm. */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2.5 text-primary font-mono font-bold text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-4">
    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
    {children}
  </span>
);

/* 2-digit zero-padded ordinal label for ranked-feel lists. */
const numLabel = (n: number) => String(n + 1).padStart(2, "0");

/* ── PAGE ──────────────────────────────────────────────────── */

const AboutPage = () => {
  const { hash } = useLocation();
  const t = useT();

  const stats: { icon: typeof TrendingUp; value: string; label: string }[] = [
    { icon: TrendingUp,    value: "100%",                              label: t("about_page.stat_practice_label") },
    { icon: Users,         value: "3+",                                label: t("about_page.stat_industries_label") },
    { icon: GraduationCap, value: t("about_page.stat_school_value"),    label: t("about_page.stat_school_label") },
    { icon: Award,         value: "TOP",                               label: t("about_page.stat_top_label") },
  ];

  const courses: { icon: typeof BrainCircuit; title: string; desc: string; tag: string }[] = [
    { icon: BrainCircuit, title: t("about_page.course_ai_title"),       desc: t("about_page.course_ai_desc"),       tag: t("about_page.course_ai_tag") },
    { icon: Box,          title: t("about_page.course_3d_title"),       desc: t("about_page.course_3d_desc"),       tag: t("about_page.course_3d_tag") },
    { icon: Camera,       title: t("about_page.course_photo_title"),    desc: t("about_page.course_photo_desc"),    tag: t("about_page.course_photo_tag") },
    { icon: Zap,          title: t("about_page.course_practice_title"), desc: t("about_page.course_practice_desc"), tag: t("about_page.course_practice_tag") },
  ];

  const audiences: { icon: typeof Target; title: string; desc: string }[] = [
    { icon: Target,    title: t("about_page.audience_school_title"),    desc: t("about_page.audience_school_desc") },
    { icon: Lightbulb, title: t("about_page.audience_beginner_title"),  desc: t("about_page.audience_beginner_desc") },
    { icon: Heart,     title: t("about_page.audience_all_title"),       desc: t("about_page.audience_all_desc") },
  ];

  const formats: { icon: typeof MapPin; label: string; sub: string }[] = [
    { icon: MapPin,   label: t("about_page.format_in_person"), sub: t("about_page.format_in_person_sub") },
    { icon: Monitor,  label: t("about_page.format_online"),    sub: t("about_page.format_online_sub") },
    { icon: BookOpen, label: t("about_page.format_hybrid"),    sub: t("about_page.format_hybrid_sub") },
  ];

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
    <div className="bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      {/* ── HERO ─────────────────────────────────────────────────
       * Using surface-1 (60%) for the main background.
       * Minimalist, premium editorial layout.
       */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-32 border-b border-border">
        <Container>
          <div className="max-w-4xl relative">
            {/* Design element: Subtle vertical accent line */}
            <div
              aria-hidden
              className="absolute -left-8 top-0 bottom-0 w-px bg-primary/20 hidden lg:block"
            />

            <FadeIn direction="none">
              <SectionLabel>{t("about_page.hero_eyebrow")}</SectionLabel>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="text-hero text-foreground mb-8">
                {t("about_page.hero_title_a")} <span className="text-primary italic">{t("about_page.hero_title_b")}</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-secondary-foreground/90 text-lg sm:text-xl lg:text-2xl font-medium leading-relaxed max-w-2xl">
                {t("about_page.hero_intro")}
              </p>
            </FadeIn>

            {/* Format pills — quiet, nested chips using surface-2 (30%) */}
            <FadeIn delay={0.3}>
              <div className="flex flex-wrap gap-3 mt-12">
                {formats.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 bg-secondary/50 backdrop-blur-sm border border-border rounded-full px-5 py-2.5 hover:border-primary/40 transition-all duration-300 group"
                  >
                    <f.icon className="w-4 h-4 text-primary transition-transform group-hover:scale-110" />
                    <div className="flex flex-col">
                      <span className="text-foreground text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none mb-0.5">
                        {f.label}
                      </span>
                      <span className="text-muted-foreground text-[9px] font-medium">
                        {f.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </Container>
      </section>

      {/* ── STATS — 10% accent budget focused on values and icons.
          Each stat is now its own elevated surface-2 (30%) container. */}
      <section className="py-12 sm:py-16 bg-background relative z-10 -mt-8 sm:-mt-12">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((s, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 group text-center h-full">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <s.icon className="w-5 h-5 text-primary group-hover:text-inherit" />
                  </div>
                  <div className="text-4xl sm:text-3xl font-black text-foreground tracking-tighter leading-none mb-3">
                    {s.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold leading-tight max-w-[140px]">
                    {s.label}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      {/* ── MISSION — surface-1 (60%) background; cards use surface-2 (30%). */}
      <section className="py-24 sm:py-32 lg:py-40">
        <Container>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left — content */}
            <div className="lg:sticky lg:top-32">
              <FadeIn direction="left">
                <SectionLabel>{t("about_page.mission_eyebrow")}</SectionLabel>
                <h2 className="text-h1 mb-8">
                  {t("about_page.mission_title_a")} <br />
                  <span className="text-primary italic">{t("about_page.mission_title_b")}</span>
                </h2>
                <div className="space-y-6 text-muted-foreground text-lg font-medium leading-relaxed max-w-xl">
                  <p>{t("about_page.mission_body")}</p>
                  <p className="text-primary font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3">
                    <MapPin className="w-4 h-4" />
                    {t("about_page.mission_locations")}
                  </p>
                </div>
              </FadeIn>
            </div>

            {/* Right — refined course cards */}
            <div className="grid gap-6">
              {courses.map((c, i) => (
                <FadeIn key={c.title} delay={i * 0.1}>
                  <div className="group relative bg-card border border-border hover:border-primary/40 rounded-3xl p-8 transition-all duration-500 hover:translate-x-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm">
                        <c.icon className="w-7 h-7 text-primary group-hover:text-inherit transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                            {c.title}
                          </h3>
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                            {c.tag}
                          </span>
                        </div>
                        <p className="text-muted-foreground font-medium leading-relaxed">
                          {c.desc}
                        </p>
                      </div>
                      <span className="text-2xl font-display font-black text-muted-foreground/10 group-hover:text-primary/10 transition-colors hidden sm:block">
                        {numLabel(i)}
                      </span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── AUDIENCES — surface-2 section (30%) with surface-1 cards (60%).
          This creates a powerful visual break. */}
      <section className="py-24 sm:py-32 bg-card border-y border-border relative overflow-hidden">
        {/* Subtle background text for texture */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-foreground/[0.02] uppercase pointer-events-none select-none">
          LOGIC
        </div>

        <Container className="relative z-10">
          <FadeIn className="mb-16 sm:mb-20 text-center mx-auto">
            <SectionLabel>{t("about_page.audiences_eyebrow")}</SectionLabel>
            <h2 className="text-h1">
              {t("about_page.audiences_title_a")} <span className="text-primary">{t("about_page.audiences_title_b")}</span>
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {audiences.map((a, i) => (
              <FadeIn key={a.title} delay={i * 0.1}>
                <div className="group relative bg-background border border-border hover:border-primary/40 rounded-3xl p-10 h-full flex flex-col items-center text-center gap-6 transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-black/20">
                  <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center text-primary group-hover:border-primary/30 transition-all duration-500">
                    <a.icon className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                      {a.title}
                    </h3>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                      {a.desc}
                    </p>
                  </div>
                  <div className="mt-auto pt-4">
                    <span className="text-xs font-mono font-bold text-muted-foreground/40 tracking-[0.3em]">
                      STAGE {numLabel(i)}
                    </span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA — Focused conversion section.
          Using surface-1 for high focus and 10% accent on the main action. */}
      <section className="py-24 sm:py-32 lg:py-40">
        <Container>
          <FadeIn>
            <div className="relative bg-background border border-border rounded-[2.5rem] p-8 sm:p-16 lg:p-24 overflow-hidden group">
              {/* Interactive background glow (very subtle) */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
              
              <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="max-w-2xl text-center lg:text-left">
                  <SectionLabel>{t("about_page.cta_eyebrow")}</SectionLabel>
                  <h2 className="text-h1 mb-6 leading-[0.9]">
                    {t("about_page.cta_title_a")} <br />
                    <span className="text-primary italic">{t("about_page.cta_title_b")}</span>
                  </h2>
                  <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                    {t("about_page.cta_body")}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Link
                    to="/register"
                    className="group flex items-center justify-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                  >
                    {t("about_page.cta_register")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/courses"
                    className="flex items-center justify-center gap-3 border-2 border-border hover:border-primary/50 text-foreground px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/5 active:scale-[0.98] transition-all"
                  >
                    {t("about_page.cta_courses")}
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </Container>
      </section>

      {/* ── INSTRUCTORS — Uses its own section styling inside */}
      <InstructorsSection />
    </div>
  );
};

export default AboutPage;