import { motion } from "framer-motion";
import { BrainCircuit, Box, Camera, Rocket } from "lucide-react";

const features = [
  {
    icon: BrainCircuit, // Or Lightbulb
    title: "Արհեստական Բանականություն",
    desc: "Սովորեք Python և Machine Learning՝ ստեղծելով ալգորիթմներ, որոնք «մտածում են»:",
  },
  {
    icon: Box, // Or Layers
    title: "3D Մոդելավորում",
    desc: "3dsMax-ի և դիզայնի հիմունքների միջոցով սովորեք կառուցել թվային աշխարհներ:",
  },
  {
    icon: Camera,
    title: "Պրոֆեսիոնալ Լուսանկարչություն",
    desc: "Տիրապետեք էքսպոզիցիայի արվեստին և Photoshop-ին՝ պատմելով պատմություններ լուսանկարով:",
  },
  {
    icon: Rocket,
    title: "Մրցունակ Ապագա",
    desc: "Մեր դասընթացները նախատեսված են դպրոցականների և սկսնակների համար, ովքեր ձգտում են առաջնորդության:",
  },
];

// const stats = [
//   { icon: TrendingUp, value: "95%", label: "Գիրք Կնաբատին" },
//   { icon: Users, value: "500+", label: "Մեկնաբաններ" },
//   { icon: Clock, value: "8+", label: "Դասընթացներ" },
//   { icon: Award, value: "80%+", label: "Բարձրաթն Ակադեմիկ Ակտիվ" },
// ];

const aboutText = "«Logic Lab»-ը կրթական և տեխնոլոգիական լուծումների կենտրոն է, որտեղ միահյուսվում են տրամաբանությունն ու ստեղծագործությունը։ Մենք մասնագիտացած ենք Արհեստական Բանականության, 3D մոդելավորման և թվային արվեստի ոլորտներում՝ օգնելով սկսնակներին և պատանիներին կառուցել մրցունակ ապագա։";
const locationText = "Վանաձոր, Հայաստան";

const AboutSection = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-6">
        {/* Stats Bar - ACA style */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-20"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-[var(--gray-dark)] border border-[var(--black)] p-6 text-center shadow-lg"
            >
              <stat.icon className="w-6 h-6 text-[var(--primary-alt)] mx-auto mb-3" />
              <div className="font-display text-3xl sm:text-4xl font-bold text-[var(--primary)] mb-1">{stat.value}</div>
              <div className="text-sm text-[var(--gray-light)] opacity-60 font-bold uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div> */}

        {/* Why Choose Us */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[var(--primary-alt)] font-display font-bold text-sm uppercase tracking-widest mb-3 block">
              Ինչո՞ւ ընտրել հենց
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-[var(--white)] uppercase tracking-tighter leading-tight">
              Logic <span className="text-[var(--primary)]">Lab</span>?
            </h2>
            <p className="text-[var(--gray-light)] text-lg mb-4 leading-relaxed opacity-90">
              {aboutText}
            </p>
            <p className="text-[var(--primary-alt)] text-lg font-black uppercase tracking-widest">
              {locationText}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-5 border-2 border-[var(--gray-dark)] hover:border-[var(--primary-alt)] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center mb-3 text-[var(--primary-alt)]">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-xs mb-1 text-[var(--white)] uppercase tracking-tighter">{f.title}</h3>
                <p className="text-[10px] text-[var(--gray-light)] opacity-60 font-medium leading-tight">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;