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

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="bg-black text-white min-h-screen">
      <Container>
        <div className="py-20 max-w-3xl mx-auto space-y-16">
          <FadeIn>
            <h1 className="text-5xl font-black text-primary-alt">
              Ծառայությունների{" "}
              <span className="text-primary">Պայմաններ</span>
            </h1>
            <p className="mt-4 text-[var(--gray-light)] opacity-60 text-sm font-mono uppercase tracking-widest">
              Վերջին թարմացում՝ Մայիս 2026
            </p>
          </FadeIn>

          <Section title="1. Ընդհանուր դրույթներ">
            <p>
              Logic Lab Academy կայք օգտագործելով՝ դուք համաձայնում
              եք ստորև ներկայացված պայմաններին: Խնդրում ենք ուշադիր
              կարդալ նախքան ծառայություններից օգտվելը:
            </p>
          </Section>

          <Section title="2. Ծառայություններ">
            <p>
              Logic Lab Academy-ն տրամադրում է կրթական ծառայություններ
              AI/ML, 3D մոդելավորման, լուսանկարչության և հարակից
              ոլորտներում: Ծառայությունները հասանելի են ինչպես
              առկա, այնպես էլ առցանց ձևաչափերով:
            </p>
          </Section>

          <Section title="3. Գրանցում և հաշիվ">
            <p>
              Որոշ ծառայություններ պահանջում են նախնական գրանցում:
              Դուք պատասխանատու եք ձեր հաշվի տվյալների
              գաղտնիության ապահովման համար: Խնդրում ենք
              անհապաղ ծանուցել ցանկացած չթույլատրված
              մուտքի մասին:
            </p>
          </Section>

          <Section title="4. Վճարումներ և վերադարձ">
            <ul className="list-disc list-inside space-y-2">
              <li>Դասընթացի արժեքը վճարվում է գրանցման ժամանակ</li>
              <li>Դասընթացի մեկնարկից առաջ վճարի լրիվ վերադարձ հնարավոր է</li>
              <li>Դասընթացի ընթացքում վերադարձի հնարավորությունը քննարկվում է անհատական</li>
              <li>Վճարման հարցերով կապվեք մեր թիմի հետ</li>
            </ul>
          </Section>

          <Section title="5. Արտոնյալ օգտագործում">
            <p>
              Կայքի բոլոր նյութերը (դասընթացներ, նկարներ, տեքստեր)
              Logic Lab Academy-ի սեփականությունն են: Արգելվում է
              դրանց վերատպումը, վաճառքը կամ տարածումը առանց
              գրավոր համաձայնության:
            </p>
          </Section>

          <Section title="6. Օգտատիրոջ պարտականությունները">
            <ul className="list-disc list-inside space-y-2">
              <li>Ճշմարիտ տեղեկատվություն տրամադրել գրանցման ժամանակ</li>
              <li>Չխախտել այլ օգտատերերի իրավունքները</li>
              <li>Չօգտագործել կայքը անօրինական նպատակներով</li>
              <li>Պահպանել դասընթացների ժամանակացույցը</li>
            </ul>
          </Section>

          <Section title="7. Պատասխանատվության սահմանափակում">
            <p>
              Logic Lab Academy-ն պատասխանատվություն չի կրում
              ուղղակի կամ անուղղակի վնասների համար, որոնք
              կարող են ծագել ծառայություններից օգտվելու կամ
              կայքի ժամանակավոր անհասանելիության հետևանքով:
            </p>
          </Section>

          <Section title="8. Պայմանների փոփոխություն">
            <p>
              Logic Lab Academy-ն իրավունք է պահում ցանկացած
              ժամանակ փոփոխել այս պայմանները: Կայքի շարունակական
              օգտագործումը համարվում է համաձայնություն
              թարմացված պայմաններին:
            </p>
          </Section>

          <Section title="9. Կապ">
            <p>
              Ծառայությունների պայմանների վերաբերյալ հարցերի
              դեպքում կապվեք մեզ հետ՝{" "}
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

export default TermsOfServicePage;
