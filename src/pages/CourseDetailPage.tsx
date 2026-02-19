import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Signal, CheckCircle2, Wrench, BookOpen, Users, Award, ChevronRight } from "lucide-react";
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

  const otherCourses = coursesData.filter((c) => c.id !== course.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <VideoHero
        videoSrc={detailVideo}
        title={course.title}
        subtitle={course.shortDesc}
      >
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <Clock className="w-4 h-4" />
            {course.duration}
          </span>
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <Signal className="w-4 h-4" />
            {course.level}
          </span>
        </div>
        <Link
          to={`/register?course=${course.id}`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-full font-semibold text-base hover:brightness-110 transition glow-gold"
        >
          {"Գրանցվել"}
        </Link>
      </VideoHero>

      {/* Highlight Cards - ACA style */}
      {course.highlights && (
        <section className="py-6 -mt-16 relative z-10">
          <div className="container mx-auto px-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {course.highlights.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-xl p-5 flex items-start gap-3"
                >
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">{h}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
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
            <div className="lg:col-span-2 space-y-12">
              {/* About */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  {"\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u056b \u0574\u0561\u057d\u056b\u0576"}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {course.fullDesc}
                </p>
              </motion.div>

              {/* Structured Curriculum - ACA style */}
              {course.topicGroups ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="font-display text-2xl font-bold text-foreground mb-8">
                    {"\u056b\u0576\u0579 \u056f\u057d\u0578\u057e\u0578\u0580\u0565\u057d"}
                  </h2>
                  <div className="space-y-6">
                    {course.topicGroups.map((group, gi) => (
                      <motion.div
                        key={group.group}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + gi * 0.08 }}
                        className="rounded-xl border border-border bg-card/40 overflow-hidden"
                      >
                        <div className="bg-primary/10 px-6 py-3 border-b border-border">
                          <h3 className="font-display font-semibold text-primary text-sm uppercase tracking-wide">
                            {group.group}
                          </h3>
                        </div>
                        <div className="p-6 grid sm:grid-cols-2 gap-3">
                          {group.items.map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm text-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
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
              )}
            </div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Tools Card */}
              <div className="glass-card rounded-2xl p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-5">
                  <Wrench className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {"\u0533\u0578\u0580\u056e\u056b\u0584\u0576\u0565\u0580 \u0587 \u057f\u0565\u056d\u0576\u0578\u056c\u0578\u0563\u056b\u0561\u0576\u0565\u0580"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-8">
                  {course.tools.map((tool) => (
                    <span key={tool} className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground border border-border">
                      {tool}
                    </span>
                  ))}
                </div>

                {/* Quick Info */}
                <div className="space-y-4 mb-8 border-t border-border pt-6">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{"\u054f\u0587\u0578\u0572\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0568"}</p>
                      <p className="text-sm text-foreground font-medium">{course.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Signal className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{"\u0544\u0561\u056f\u0561\u0580\u0564\u0561\u056f"}</p>
                      <p className="text-sm text-foreground font-medium">{course.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{"\u053d\u0574\u0562\u056b \u0579\u0561\u0583\u0568"}</p>
                      <p className="text-sm text-foreground font-medium">10-15 {"\u0578\u0582\u057d\u0561\u0576\u0578\u0572"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{"\u054d\u0565\u0580\u057f\u056b\u0586\u056b\u056f\u0561\u057f"}</p>
                      <p className="text-sm text-foreground font-medium">{"\u0531\u0575\u0578"}</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-3">
                  <Link
                    to={`/register?course=${course.id}`}
                    className="block w-full bg-primary text-primary-foreground py-3.5 rounded-full font-semibold text-center hover:brightness-110 transition glow-gold"
                  >
                    {"Գրանցվել"}
                  </Link>
                  
                  <Link
                    to="/courses"
                    className="block w-full border border-border text-foreground py-3 rounded-full font-semibold text-center hover:bg-secondary transition"
                  >
                    {"\u0531\u0575\u056c \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580"}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Other Courses - ACA style */}
      <section className="py-20 bg-dark-surface">
        <div className="container mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-10"
          >
            {"\u0531\u0575\u056c \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580"}
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {otherCourses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/courses/${c.id}`}
                  className="glass-card rounded-2xl p-6 hover:border-primary/40 transition-all duration-300 group block h-full"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <c.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{c.duration}</p>
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

export default CourseDetailPage;
