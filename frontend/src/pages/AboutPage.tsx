import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { getInstructors } from "@/api/instructors";
import { motion } from "framer-motion";
import { GraduationCap, Users, Award, Lightbulb, TrendingUp, Clock, Target, Zap, Heart, Globe } from "lucide-react";
import Section from "../components/layout/Section";
import Container from "../components/layout/Container";
import Card from "../components/ui/Card";
import { User } from "lucide-react";

const stats = [
  { icon: TrendingUp, value: "95%", label: "Գոհ գնահատին" },
  { icon: Users, value: "500+", label: "Ուսանող" },
  { icon: Clock, value: "8+", label: "Դասընթաց" },
  { icon: Award, value: "80%+", label: "Աշխատանքի ապահովում" },
];

const AboutPage = () => {
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: getInstructors,
  });

  return (
    <div className="bg-[var(--black)] text-[var(--white)]">
      {/* Page Header */}
      <Section className="bg-[var(--primary)] !py-20">
        <Container>
          <div className="max-w-3xl">
            <span className="text-[var(--white)] font-mono font-bold text-xs uppercase tracking-[0.3em] mb-4 block">Logic Lab — Our Mission</span>
            <h1 className="text-[var(--primary-alt)] text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter mb-8">
              ՄԵՐ <br /> ՄԱՍԻՆ
            </h1>
            <p className="text-[var(--white)] text-lg md:text-xl font-black leading-relaxed opacity-95">
              LogicLab-ը կրթական հաստատություն է, որը մասնագիտացված է տեխնոլոգիական կրթության ոլորտում:
            </p>
          </div>
        </Container>
      </Section>

      {/* Stats */}
      <Section dark>
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="text-center p-8 border-none bg-[var(--black)] shadow-2xl" hoverable={false}>
                  <stat.icon className="w-8 h-8 text-[var(--primary-alt)] mx-auto mb-4" />
                  <div className="text-4xl font-black text-[var(--primary)] mb-2">{stat.value}</div>
                  <div className="text-xs text-[var(--gray-light)] opacity-50 uppercase tracking-[0.2em] font-black">{stat.label}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Mission & Story */}
      <Section>
        <Container>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-[var(--primary-alt)] font-black text-sm uppercase tracking-[0.3em] mb-4 block">
                Ինչո՞ւ ընտրել հենց
              </span>
              <h2 className="text-4xl md:text-5xl font-black mb-8 text-[var(--white)] uppercase tracking-tighter leading-tight">
                Logic <span className="text-[var(--primary)]">Lab</span>?
              </h2>
              <div className="space-y-6 text-[var(--gray-light)] opacity-80 text-lg font-medium leading-relaxed">
                <p>
                  Logic Lab-ը կրթական հաստատություն է, որը մասնագիտացված է տեխնոլոգիական կրթության ոլորտում։ Մենք առաջարկում ենք AI, Machine Learning, ծրագրավորում և 3D վիզուալիզացիայի դասընթացներ։
                </p>
                <p className="text-[var(--primary-alt)] font-black uppercase tracking-[0.2em]">Վանաձոր, Հայաստան</p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: GraduationCap, title: "Փորձագետ դասախոսներ", desc: "Մեր դասընթացները վարում են ոլորտի փորձագետները։" },
                { icon: Users, title: "Փոքր խմբեր", desc: "Սովորեք գործնական նախագծերի վրա միասին։" },
                { icon: Award, title: "Սերտիֆիկատ", desc: "Ստացեք սերտիֆիկատ դասընթացի ավարտին։" },
                { icon: Lightbulb, title: "Գործնական հմտություններ", desc: "Տեսական և գործնական հմտություններ։" },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full bg-[var(--gray-dark)] border-2 border-[var(--black)] hover:border-[var(--primary-alt)] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center mb-4 text-[var(--black)]">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black mb-2 text-[var(--white)] uppercase tracking-tighter leading-tight">{f.title}</h3>
                    <p className="text-[10px] text-[var(--gray-light)] opacity-60 font-medium leading-tight">{f.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Values */}
      <Section dark>
        <Container>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-[var(--white)] uppercase tracking-tighter leading-tight">
              Մեր <span className="text-[var(--primary-alt)]">Արժեքները</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Target, title: "Նպատակ", desc: "Մենք նպատակադրված ենք որակյալ կրթության" },
              { icon: Zap, title: "Իննովացիա", desc: "Տեխնոլոգիաների առաջամասում" },
              { icon: Heart, title: "Համայնք", desc: "Մենք համայնք ենք ներդաշնակում" },
              { icon: Globe, title: "Միջազգային", desc: "Միջազգային չափանիշներ" },
            ].map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="text-center p-8 h-full bg-[var(--black)] border-2 border-[var(--gray-dark)] hover:border-[var(--primary)] transition-all">
                  <div className="w-14 h-14 rounded-xl bg-[var(--gray-dark)] flex items-center justify-center mx-auto mb-6 text-[var(--primary-alt)] border border-[var(--black)] shadow-inner">
                    <v.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-black text-[var(--white)] mb-3 uppercase tracking-tighter leading-tight">{v.title}</h3>
                  <p className="text-[10px] text-[var(--gray-light)] opacity-50 font-medium leading-tight">{v.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Team */}
      <Section>
        <Container>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-[var(--white)] uppercase tracking-tighter leading-tight">
              Մեր <span className="text-[var(--primary)]">Թիմը</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-[var(--gray-dark)] rounded-2xl animate-pulse" />
              ))
            ) : (
              instructors?.map((instructor, i) => (
                <motion.div
                  key={instructor.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-8 text-center group border-2 border-[var(--gray-dark)] hover:border-[var(--primary-alt)] transition-all bg-[var(--gray-dark)]"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-4 border-[var(--black)] shadow-xl group-hover:scale-105 transition-transform">
                    {instructor.user.profile_image ? (
                      <img
                        src={instructor.user.profile_image}
                        alt={`${instructor.user.first_name} ${instructor.user.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--black)] flex items-center justify-center">
                        <User className="w-10 h-10 text-[var(--primary)]" />
                      </div>
                    )}
                  </div>

                  <h3 className="font-display font-black text-xl text-[var(--white)] mb-2 uppercase tracking-tighter leading-tight">
                    {instructor.user.first_name} {instructor.user.last_name}
                  </h3>
                  <p className="text-[10px] text-[var(--primary-alt)] font-black uppercase tracking-[0.2em]">
                    {instructor.skills?.slice(0, 3).join(", ")}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default AboutPage;
