import { motion } from "framer-motion";
import { BrainCircuit, Box, Camera, Rocket } from "lucide-react";
import { useT } from "@/i18n";

const AboutSection = () => {
  const t = useT();
  const features = [
    { icon: BrainCircuit, title: t('home.feature_ai_title'),     desc: t('home.feature_ai_desc') },
    { icon: Box,          title: t('home.feature_3d_title'),     desc: t('home.feature_3d_desc') },
    { icon: Camera,       title: t('home.feature_photo_title'),  desc: t('home.feature_photo_desc') },
    { icon: Rocket,       title: t('home.feature_future_title'), desc: t('home.feature_future_desc') },
  ];
  const aboutText = t('home.about_body');
  const locationText = t('home.about_location');

  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-6">
        {/* Why Choose Us */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[var(--primary-alt)] font-display font-bold text-base uppercase tracking-widest mb-4 block">
              {t('home.about_eyebrow')}
            </span>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 text-[var(--white)] uppercase tracking-tighter leading-tight">
              {t('home.about_heading_a')} <span className="text-[#FFD700]">{t('home.about_heading_b')}</span>
            </h2>
            {aboutText && (
              <p className="text-[var(--gray-light)] text-xl mb-6 leading-relaxed opacity-90">
                {aboutText}
              </p>
            )}
            {locationText && (
              <p className="text-[var(--primary-alt)] text-xl font-black uppercase tracking-widest">
                {locationText}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6"
          >
            {features && features.length > 0 && features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-7 border-2 border-[var(--gray-dark)] hover:border-[#FFC000] transition-all h-full"
              >
                {f.icon && (
                  <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl bg-[#FFD700] flex items-center justify-center mb-3 sm:mb-4 text-[var(--black)] flex-shrink-0">
                    <f.icon className="w-6 h-6 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                  </div>
                )}
                {f.title && (
                  <h3 className="font-display font-black text-sm sm:text-base lg:text-lg mb-2 text-[var(--white)] uppercase tracking-tighter leading-tight">{f.title}</h3>
                )}
                {f.desc && (
                  <p className="text-xs sm:text-sm lg:text-base text-[var(--gray-light)] opacity-70 font-medium leading-relaxed">{f.desc}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;