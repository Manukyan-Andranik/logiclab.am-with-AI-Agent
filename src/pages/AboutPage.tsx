import { motion } from "framer-motion";
import { GraduationCap, Users, Award, Lightbulb, TrendingUp, Clock, Target, Zap, Heart, Globe } from "lucide-react";
import VideoHero from "@/components/VideoHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import coursesVideo from "@/assets/courses-hero-video.mp4";

const stats = [
  { icon: TrendingUp, value: "95%", label: "\u0533\u0578\u0570 \u0563\u0576\u0561\u0570\u0561\u057f\u056b\u0576" },
  { icon: Users, value: "500+", label: "\u0548\u0582\u057d\u0561\u0576\u0578\u0572" },
  { icon: Clock, value: "8+", label: "\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581" },
  { icon: Award, value: "80%+", label: "\u0531\u0577\u056d\u0561\u057f\u0561\u0576\u0584\u056b \u0561\u057a\u0561\u0570\u0578\u057e\u0578\u0582\u0574" },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <VideoHero
        videoSrc={coursesVideo}
        titleHighlight={"\u0544\u0565\u0580"}
        title={"\u0574\u0561\u057d\u056b\u0576"}
        subtitle="Logic Lab-\u0568 \u056f\u0580\u0569\u0561\u056f\u0561\u0576 \u0570\u0561\u057d\u057f\u0561\u057f\u0578\u0582\u0569\u0575\u0578\u0582\u0576 \u0567, \u0578\u0580\u0568 \u0574\u0561\u057d\u0576\u0561\u0563\u056b\u057f\u0561\u0581\u057e\u0561\u056e \u0567 \u057f\u0565\u056d\u0576\u0578\u056c\u0578\u0563\u056b\u0561\u056f\u0561\u0576 \u056f\u0580\u0569\u0578\u0582\u0569\u0575\u0561\u0576 \u0578\u056c\u0578\u0580\u057f\u0578\u0582\u0574"
      />

      {/* Stats */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-primary/10 border border-primary/20 p-6 text-center"
              >
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                <div className="font-display text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Story */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-primary font-display font-bold text-sm uppercase tracking-widest mb-3 block">
                {"\u053b\u0576\u0579\u0578\u0582\u055e \u0568\u0576\u057f\u0580\u0565\u056c \u0570\u0565\u0576\u0581"}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Logic <span className="text-gradient-gold">Lab</span>{"?"}
              </h2>
              <p className="text-muted-foreground text-lg mb-4 leading-relaxed">
                {"Logic Lab-\u0568 \u056f\u0580\u0569\u0561\u056f\u0561\u0576 \u0570\u0561\u057d\u057f\u0561\u057f\u0578\u0582\u0569\u0575\u0578\u0582\u0576 \u0567, \u0578\u0580\u0568 \u0574\u0561\u057d\u0576\u0561\u0563\u056b\u057f\u0561\u0581\u057e\u0561\u056e \u0567 \u057f\u0565\u056d\u0576\u0578\u056c\u0578\u0563\u056b\u0561\u056f\u0561\u0576 \u056f\u0580\u0569\u0578\u0582\u0569\u0575\u0561\u0576 \u0578\u056c\u0578\u0580\u057f\u0578\u0582\u0574\u0589 \u0544\u0565\u0576\u0584 \u0561\u057c\u0561\u057b\u0561\u0580\u056f\u0578\u0582\u0574 \u0565\u0576\u0584 AI, Machine Learning, \u056e\u0580\u0561\u0563\u0580\u0561\u057e\u0578\u0580\u0578\u0582\u0574 \u0587 3D \u057e\u056b\u0566\u0578\u0582\u0561\u056c\u056b\u0566\u0561\u0581\u056b\u0561\u0575\u056b \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0589"}
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {"\u054e\u0561\u0576\u0561\u0571\u0578\u0580, \u0540\u0561\u0575\u0561\u057d\u057f\u0561\u0576"}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: GraduationCap, title: "\u0553\u0578\u0580\u0571\u0561\u0563\u0565\u057f \u0564\u0561\u057d\u0561\u056d\u0578\u057d\u0576\u0565\u0580", desc: "\u0544\u0565\u0580 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568 \u057e\u0561\u0580\u0578\u0582\u0574 \u0565\u0576 \u0578\u056c\u0578\u0580\u057f\u056b \u0583\u0578\u0580\u0571\u0561\u0563\u0565\u057f\u0576\u0565\u0580\u0568\u0589" },
                { icon: Users, title: "\u0553\u0578\u0584\u0580 \u056d\u0574\u0562\u0565\u0580", desc: "\u054d\u0578\u057e\u0578\u0580\u0565\u0584 \u0563\u0578\u0580\u056e\u0576\u0561\u056f\u0561\u0576 \u0576\u0561\u056d\u0561\u0563\u056e\u0565\u0580\u056b \u057e\u0580\u0561 \u0574\u056b\u0561\u057d\u056b\u0576\u0589" },
                { icon: Award, title: "\u054d\u0565\u0580\u057f\u056b\u0586\u056b\u056f\u0561\u057f", desc: "\u054d\u057f\u0561\u0581\u0565\u0584 \u057d\u0565\u0580\u057f\u056b\u0586\u056b\u056f\u0561\u057f \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u056b \u0561\u057e\u0561\u0580\u057f\u056b\u0576\u0589" },
                { icon: Lightbulb, title: "\u0533\u0578\u0580\u056e\u0576\u0561\u056f\u0561\u0576 \u0570\u0574\u057f\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0576\u0565\u0580", desc: "\u054f\u0565\u057d\u0561\u056f\u0561\u0576 \u0587 \u0563\u0578\u0580\u056e\u0576\u0561\u056f\u0561\u0576 \u0570\u0574\u057f\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0576\u0565\u0580\u0589" },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold mb-1 text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {"\u0544\u0565\u0580 "}<span className="text-gradient-gold">{"\u0561\u0580\u056a\u0565\u0584\u0576\u0565\u0580\u0568"}</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Target, title: "\u0546\u057a\u0561\u057f\u0561\u056f", desc: "\u0544\u0565\u0576\u0584 \u0576\u057a\u0561\u057f\u0561\u056f\u0561\u0564\u0580\u057e\u0561\u056e \u0565\u0576\u0584 \u0578\u0580\u0561\u056f\u0575\u0561\u056c \u056f\u0580\u0569\u0578\u0582\u0569\u0575\u0561\u0576" },
              { icon: Zap, title: "\u053b\u0576\u0578\u057e\u0561\u0581\u056b\u0561", desc: "\u054f\u0565\u056d\u0576\u0578\u056c\u0578\u0563\u056b\u0561\u0576\u0565\u0580\u056b \u0561\u057c\u0561\u057b\u0561\u0574\u0561\u057d\u056b\u0576\u0578\u0582\u0574" },
              { icon: Heart, title: "\u0540\u0561\u0574\u0561\u0575\u0576\u0584", desc: "\u0544\u0565\u0576\u0584 \u0570\u0561\u0574\u0561\u0575\u0576\u0584 \u0565\u0576\u0584 \u0576\u0565\u0580\u0564\u0561\u0577\u0576\u0561\u056f\u0578\u0582\u0574" },
              { icon: Globe, title: "\u0544\u056b\u057b\u0561\u0566\u0563\u0561\u0575\u056b\u0576", desc: "\u0544\u056b\u057b\u0561\u0566\u0563\u0561\u0575\u056b\u0576 \u0579\u0561\u0583\u0561\u0576\u056b\u0577\u0576\u0565\u0580" },
            ].map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <v.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {"\u0544\u0565\u0580 "}<span className="text-gradient-gold">{"\u0569\u056b\u0574\u0568"}</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "\u0531\u0580\u0574\u0561\u0576 \u0544\u0561\u0580\u057f\u056b\u0580\u0578\u057d\u0575\u0561\u0576", role: "\u0540\u056b\u0574\u0576\u0561\u0564\u056b\u0580 / AI \u0534\u0561\u057d\u0561\u056d\u0578\u057d", expertise: "Python, TensorFlow, PyTorch" },
              { name: "\u0531\u0576\u056b \u054d\u0561\u0580\u0563\u057d\u0575\u0561\u0576", role: "ML \u0534\u0561\u057d\u0561\u056d\u0578\u057d", expertise: "Scikit-learn, Deep Learning" },
              { name: "\u0544\u0561\u0580\u056f \u0540\u0561\u056f\u0578\u0562\u0575\u0561\u0576", role: "Web Dev \u0534\u0561\u057d\u0561\u056d\u0578\u057d", expertise: "JavaScript, React, Node.js" },
              { name: "\u0534\u0561\u057e\u056b\u0569 \u0531\u0564\u0561\u0574\u0575\u0561\u0576", role: "3D / Design \u0534\u0561\u057d\u0561\u056d\u0578\u057d", expertise: "3ds Max, V-Ray, Photoshop" },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">{t.name}</h3>
                <p className="text-sm text-primary font-medium mb-2">{t.role}</p>
                <p className="text-xs text-muted-foreground">{t.expertise}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
