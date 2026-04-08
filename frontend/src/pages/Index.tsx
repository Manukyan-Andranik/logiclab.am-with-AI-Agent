import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Hero from "@/components/layout/Hero";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import CoursesSection from "@/components/CoursesSection";
import AboutSection from "@/components/AboutSection";
import FeaturedProjects from "@/components/FeaturedProjects";
import InstructorsSection from "@/components/InstructorsSection";
import ContactSection from "@/components/ContactSection";
import DailyLifes from "@/components/DailyLifes";

const Index = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [hash]);

  return (
    <div className="bg-black text-white">
      {/* Hero Section matches Tilda ml.html visually */}
      <Hero />

      <main>
        {/* All sections use Section component with controlled dark/light toggle */}
        <Section id="daily-life" dark>
          <Container>
            <DailyLifes />
          </Container>
        </Section>

        <Section id="courses" dark>
          <Container>
            <CoursesSection />
          </Container>
        </Section>

        <Section id="about">
          <Container>
            <AboutSection />
          </Container>
        </Section>

        <Section id="projects">
          <Container>
            <FeaturedProjects />
          </Container>
        </Section>

        <Section id="contact">
          <Container>
            <ContactSection />
          </Container>
        </Section>
      </main>
    </div>
  );
};

export default Index;
