import React from "react";
import { motion } from "framer-motion";
import Container from "../components/layout/Container";

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
  return (
    <div className="bg-black text-white min-h-screen">
      <Container>
        <div className="py-20 max-w-3xl mx-auto space-y-16">
          <FadeIn>
            <h1 className="text-5xl font-black text-primary-alt">
              Գաղտնիության{" "}
              <span className="text-primary">Քաղաքականություն</span>
            </h1>
            <p className="mt-4 text-[var(--gray-light)] opacity-60 text-sm font-mono uppercase tracking-widest">
              Վերջին թարմացում՝ Մայիս 2026
            </p>
          </FadeIn>

          <Section title="1. Ընդհանուր դրույթներ">
            <p>
              Logic Lab Academy-ն պատասխանատու է ձեր անձնական տվյալների
              պաշտպանության համար: Այս քաղաքականությունը բացատրում է, թե
              ինչ տվյալներ ենք հավաքում, ինչպես ենք դրանք օգտագործում և
              ինչ իրավունքներ ունեք դրանց վերաբերյալ:
            </p>
          </Section>

          <Section title="2. Հավաքվող տվյալներ">
            <p>Մենք կարող ենք հավաքել հետևյալ տվյալները.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Անուն, ազգանուն և կոնտակտային տեղեկատվություն (էլ. փոստ, հեռախոս)</li>
              <li>Գրանցման և վճարման տվյալներ</li>
              <li>Կայքի օգտագործման վիճակագրություն (cookies, IP հասցե)</li>
              <li>Ուղարկված հաղորդագրություններ և հայտեր</li>
            </ul>
          </Section>

          <Section title="3. Տվյալների օգտագործում">
            <p>Հավաքված տվյալները օգտագործվում են.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Դասընթացների գրանցման և ծառայությունների մատուցման համար</li>
              <li>Կրթական առաջընթացի հետևողականության ապահովման համար</li>
              <li>Կայքի բարելավման և անվտանգության ապահովման համար</li>
              <li>Ձեզ հետ կապ հաստատելու և ծանուցումներ ուղարկելու համար</li>
            </ul>
          </Section>

          <Section title="4. Տվյալների պաշտպանություն">
            <p>
              Մենք կիրառում ենք ժամանակակից անվտանգության մեթոդներ ձեր
              տվյալների պաշտպանության համար: Ձեր անձնական տվյալները չեն
              վաճառվում կամ կիսվում երրորդ կողմերի հետ առանց ձեր
              համաձայնության, բացառությամբ օրենքով պահանջվող դեպքերի:
            </p>
          </Section>

          <Section title="5. Cookies">
            <p>
              Մեր կայքը օգտագործում է cookies՝ բրաուզինգի փորձը
              բարելավելու նպատակով: Դուք կարող եք անջատել cookies-ները
              ձեր բրաուզերի կարգավորումներում, սակայն դա կարող է
              ազդել կայքի ֆունկցիոնալության վրա:
            </p>
          </Section>

          <Section title="6. Ձեր իրավունքները">
            <p>Դուք ունեք հետևյալ իրավունքները.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Ստանալ ձեր պահված տվյալների պատճենը</li>
              <li>Պահանջել անճշտությունների ուղղում</li>
              <li>Պահանջել ձեր տվյալների ջնջում</li>
              <li>Դադարեցնել ձեր տվյալների մշակումը</li>
            </ul>
          </Section>

          <Section title="7. Կապ">
            <p>
              Ձեր անձնական տվյալների վերաբերյալ հարցերի դեպքում
              կապվեք մեզ հետ՝{" "}
              <a
                href="mailto:info@logiclab.am"
                className="text-primary hover:text-primary-alt transition-colors"
              >
                info@logiclab.am
              </a>{" "}
              էլ. փոստի միջոցով:
            </p>
          </Section>
        </div>
      </Container>
    </div>
  );
};

export default PrivacyPolicyPage;
