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

const PrivacyPolicyPage: React.FC = () => {
  const t = useT();
  return (
    <div className="bg-black text-white min-h-screen">
      <Container>
        <div className="py-20 max-w-3xl mx-auto space-y-16">
          <FadeIn>
            <h1 className="text-5xl font-black text-primary-alt">
              {t("privacy.title_a")}{" "}
              <span className="text-primary">{t("privacy.title_b")}</span>
            </h1>
            <p className="mt-4 text-[var(--gray-light)] opacity-60 text-sm font-mono uppercase tracking-widest">
              {t("privacy.updated")}
            </p>
          </FadeIn>

          <Section title={t("privacy.s1_title")}>
            <p>{t("privacy.s1_body")}</p>
          </Section>

          <Section title={t("privacy.s2_title")}>
            <p>{t("privacy.s2_intro")}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("privacy.s2_item1")}</li>
              <li>{t("privacy.s2_item2")}</li>
              <li>{t("privacy.s2_item3")}</li>
              <li>{t("privacy.s2_item4")}</li>
            </ul>
          </Section>

          <Section title={t("privacy.s3_title")}>
            <p>{t("privacy.s3_intro")}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("privacy.s3_item1")}</li>
              <li>{t("privacy.s3_item2")}</li>
              <li>{t("privacy.s3_item3")}</li>
              <li>{t("privacy.s3_item4")}</li>
            </ul>
          </Section>

          <Section title={t("privacy.s4_title")}>
            <p>{t("privacy.s4_body")}</p>
          </Section>

          <Section title={t("privacy.s5_title")}>
            <p>{t("privacy.s5_body")}</p>
          </Section>

          <Section title={t("privacy.s6_title")}>
            <p>{t("privacy.s6_intro")}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("privacy.s6_item1")}</li>
              <li>{t("privacy.s6_item2")}</li>
              <li>{t("privacy.s6_item3")}</li>
              <li>{t("privacy.s6_item4")}</li>
            </ul>
          </Section>

          <Section title={t("privacy.s7_title")}>
            <p>
              {t("privacy.s7_body_prefix")}
              <a
                href="mailto:info@logiclab.am"
                className="text-primary hover:text-primary-alt transition-colors"
              >
                info@logiclab.am
              </a>
              {t("privacy.s7_body_suffix")}
            </p>
          </Section>
        </div>
      </Container>
    </div>
  );
};

export default PrivacyPolicyPage;
