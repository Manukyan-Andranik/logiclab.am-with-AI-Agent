import { motion } from "framer-motion";
import heroVideo from "@/assets/hero-video.mp4";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { value: "8+", label: "\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581" },
  { value: "500+", label: "\u0548\u0582\u057d\u0561\u0576\u0578\u0572" },
  { value: "95%", label: "\u0533\u0578\u0570 \u0563\u0576\u0561\u0570\u0561\u057f\u056b\u0576" },
];

const tags = ["AI", "Machine Learning", "3D Visualisation", "Python", "Web Dev"];

const HeroSection = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={heroBg}
          className="w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      <div className="relative container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium border border-primary/40 text-primary bg-primary/10 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6"
          >
            <span className="text-gradient-gold">Logic</span>{" "}
            <span className="text-foreground">Lab</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10"
          >
            {"\u0544\u056b\u0561\u0581\u0565\u055b\u0584 \u0574\u0565\u0580 \u0574\u0561\u057d\u0576\u0561\u0563\u056b\u057f\u0561\u056f\u0561\u0576 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u056b\u0576, \u0578\u0580\u0578\u0576\u0584 \u0561\u0576\u0581\u056f\u0561\u0581\u0576\u0578\u0582\u0574 \u0565\u0576 \u0578\u056c\u0578\u0580\u057f\u056b \u0583\u0578\u0580\u0571\u0561\u0563\u0565\u057f\u0576\u0565\u0580\u0568"}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-wrap gap-4 mb-16"
          >
            <a
              href="#courses"
              onClick={(e) => { e.preventDefault(); document.querySelector("#courses")?.scrollIntoView({ behavior: "smooth" }); }}
              className="bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-semibold text-base hover:brightness-110 transition glow-gold"
            >
              {"\u0534\u056b\u057f\u0565\u056c \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568"}
            </a>
            <a
              href="#contact"
              onClick={(e) => { e.preventDefault(); document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" }); }}
              className="border border-foreground/20 text-foreground px-8 py-3.5 rounded-lg font-semibold text-base hover:bg-secondary/50 backdrop-blur-sm transition"
            >
              {"\u053f\u0561\u057a\u057e\u0565\u0584 \u0574\u0565\u0566 \u0570\u0565\u057f"}
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-3 gap-6 max-w-md"
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-3xl sm:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
