import React from "react";
import { motion } from "framer-motion";
import Container from "../components/layout/Container";
import { useT } from "@/i18n";

const FadeIn = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <FadeIn className="space-y-4">
    <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">
      {title}
    </h2>
    <div className="text-[var(--gray-light)] opacity-80 space-y-3 leading-relaxed pl-5">
      {children}
    </div>
  </FadeIn>
);

const TermsOfServicePage: React.FC = () => {
  const t = useT();
  return (
    <div className="bg-black text-white min-h-screen">
      <Container>
        <div className="py-20 max-w-3xl mx-auto space-y-16">
          <FadeIn>
            <h1 className="text-5xl font-black text-primary-alt">
              {t("terms.title_a")}{" "}
              <span className="text-primary">{t("terms.title_b")}</span>
            </h1>
            <p className="mt-4 text-[var(--gray-light)] opacity-60 text-sm font-mono uppercase tracking-widest">
              {t("terms.updated")}
            </p>
          </FadeIn>

          <Section title={t("terms.s1_title")}>
            <p>{t("terms.s1_body")}</p>
          </Section>

          <Section title={t("terms.s2_title")}>
            <p>{t("terms.s2_body")}</p>
          </Section>

          <Section title={t("terms.s3_title")}>
            <p>{t("terms.s3_intro")}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("terms.s3_item1")}</li>
              <li>{t("terms.s3_item2")}</li>
              <li>{t("terms.s3_item3")}</li>
              <li>{t("terms.s3_item4")}</li>
            </ul>
          </Section>

          <Section title={t("terms.s4_title")}>
            <p>{t("terms.s4_intro")}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("terms.s4_item1")}</li>
              <li>{t("terms.s4_item2")}</li>
              <li>{t("terms.s4_item3")}</li>
            </ul>
          </Section>

          <Section title={t("terms.s5_title")}>
            <p>{t("terms.s5_body")}</p>
          </Section>

          <Section title={t("terms.s6_title")}>
            <p>{t("terms.s6_body")}</p>
          </Section>

          <Section title={t("terms.s7_title")}>
            <p>{t("terms.s7_body")}</p>
          </Section>

          <Section title={t("terms.s8_title")}>
            <p>
              {t("terms.s8_body_prefix")}
              <a
                href="mailto:info@logiclab.am"
                className="text-primary hover:text-primary-alt transition-colors"
              >
                info@logiclab.am
              </a>
              {t("terms.s8_body_suffix")}
            </p>
          </Section>
        </div>
      </Container>
    </div>
  );
};

export default TermsOfServicePage;
