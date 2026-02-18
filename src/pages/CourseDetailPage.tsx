import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Signal, CheckCircle2, Wrench } from "lucide-react";
import VideoHero from "@/components/VideoHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { coursesData } from "@/data/courses";
import detailVideo from "@/assets/course-detail-video.mp4";

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const course = coursesData.find((c) => c.id === id);

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">
            {"\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0568 \u0579\u056b \u0563\u057f\u0576\u057e\u0565\u056c"}
          </h1>
          <Link to="/courses" className="text-primary hover:underline">
            {"\u054e\u0565\u0580\u0561\u0564\u0561\u057c\u0576\u0561\u056c \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u056b\u0576"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <VideoHero
        videoSrc={detailVideo}
        title={course.title}
        subtitle={course.shortDesc}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <Clock className="w-4 h-4" />
            {course.duration}
          </span>
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <Signal className="w-4 h-4" />
            {course.level}
          </span>
        </div>
      </VideoHero>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            {"\u0532\u0578\u056c\u0578\u0580 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568"}
          </Link>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  {"\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u056b \u0574\u0561\u057d\u056b\u0576"}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {course.fullDesc}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                  {"\u053b\u0576\u0579 \u056f\u057d\u0578\u057e\u0578\u0580\u0565\u0584"}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {course.topics.map((topic, i) => (
                    <motion.div
                      key={topic}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground text-sm">{topic}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-xl p-6 sticky top-24">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                  {"\u0533\u0578\u0580\u056e\u056b\u0584\u0576\u0565\u0580 \u0587 \u057f\u0565\u056d\u0576\u0578\u056c\u0578\u0563\u056b\u0561\u0576\u0565\u0580"}
                </h3>
                <div className="space-y-3">
                  {course.tools.map((tool) => (
                    <div key={tool} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Wrench className="w-4 h-4 text-primary shrink-0" />
                      {tool}
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  <a
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault();
                      // Navigate to home page contact section
                      window.location.href = "/#contact";
                    }}
                    className="block w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-center hover:brightness-110 transition glow-gold"
                  >
                    {"\u0533\u0580\u0561\u0576\u057e\u0565\u056c"}
                  </a>
                  <Link
                    to="/courses"
                    className="block w-full border border-border text-foreground py-3 rounded-lg font-semibold text-center hover:bg-secondary transition"
                  >
                    {"\u0531\u0575\u056c \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580"}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CourseDetailPage;
