import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Signal } from "lucide-react";
import VideoHero from "@/components/VideoHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { coursesData } from "@/data/courses";
import coursesVideo from "@/assets/courses-hero-video.mp4";

const CoursesPage = () => {
  const professions = coursesData.filter((c) => c.category === "profession");
  const courses = coursesData.filter((c) => c.category === "course");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <VideoHero
        videoSrc={coursesVideo}
        titleHighlight={"\u0544\u0565\u0580"}
        title={"\u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568"}
        subtitle={"\u0538\u0576\u057f\u0580\u0565\u0584 \u0571\u0565\u0566 \u0570\u0561\u0574\u0561\u057a\u0561\u057f\u0561\u057d\u056d\u0561\u0576 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0568 \u0587 \u057d\u056f\u057d\u0565\u0584 \u0571\u0565\u0580 \u056f\u0561\u0580\u056b\u0565\u0580\u0561\u0576"}
      />

      {/* Professions Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <span className="text-primary font-display font-bold text-sm uppercase tracking-widest mb-2 block">Logic Lab</span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              {"\u0544\u0531\u054d\u0546\u0531\u0533\u053b\u054f\u0548\u0552\u054f\u0545\u0548\u0552\u0546\u0546\u0535\u054c"}
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {professions.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/courses/${course.id}`}
                  className="block h-full rounded-2xl bg-primary p-8 hover:brightness-110 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <course.icon className="w-10 h-10 text-primary-foreground/60" />
                  </div>

                  <div className="relative z-10">
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground mb-4 pr-16">
                      {course.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-primary-foreground/70 mb-6">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Signal className="w-4 h-4" />
                        {course.level}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-foreground text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                      {"\u056e\u0561\u0576\u0578\u0569\u0561\u0576\u0561\u056c"}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Courses Section */}
      <section className="py-20 bg-dark-surface">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <span className="text-primary font-display font-bold text-sm uppercase tracking-widest mb-2 block">Logic Lab</span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              {"\u0531\u0545\u053c \u0534\u0531\u054d\u0538\u0546\u0539\u0531\u0551\u0546\u0535\u054c"}
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/courses/${course.id}`}
                  className="glass-card rounded-2xl p-6 hover:border-primary/40 transition-all duration-300 group block h-full"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <course.icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                      {course.duration}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    {course.shortDesc}
                  </p>

                  <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                    {"\u056e\u0561\u0576\u0578\u0569\u0561\u0576\u0561\u056c"}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CoursesPage;
