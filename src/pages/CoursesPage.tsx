import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Signal } from "lucide-react";
import VideoHero from "@/components/VideoHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { coursesData } from "@/data/courses";
import coursesVideo from "@/assets/courses-hero-video.mp4";

const CoursesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <VideoHero
        videoSrc={coursesVideo}
        titleHighlight={"\u0544\u0565\u0580"}
        title={"\u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568"}
        subtitle={"\u0538\u0576\u057f\u0580\u0565\u0584 \u0571\u0565\u0566 \u0570\u0561\u0574\u0561\u057a\u0561\u057f\u0561\u057d\u056d\u0561\u0576 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0568 \u0587 \u057d\u056f\u057d\u0565\u0584 \u0571\u0565\u0580 \u056f\u0561\u0580\u056b\u0565\u0580\u0561\u0576"}
      />

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {coursesData.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/courses/${course.id}`}
                  className="glass-card rounded-xl p-6 hover:border-primary/40 transition-all duration-300 group block h-full"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <course.icon className="w-7 h-7 text-primary" />
                  </div>

                  <h3 className="font-display text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    {course.shortDesc}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {course.duration}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Signal className="w-3.5 h-3.5 text-primary" />
                      {course.level}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                    {"\u0544\u0561\u0576\u0580\u0561\u0574\u0561\u057d\u0576\u0565\u0580"}
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
