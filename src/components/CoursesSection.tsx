import { motion } from "framer-motion";
import { Brain, Code, BarChart3, Globe, Calculator, Box, Camera, Database } from "lucide-react";

const courses = [
  {
    icon: Brain,
    title: "\u0531\u0580\u0570\u0565\u057d\u057f\u0561\u056f\u0561\u0576 \u0532\u0561\u0576\u0561\u056f\u0561\u0576\u0578\u0582\u0569\u0575\u0578\u0582\u0576 (AI)",
    desc: "AI-\u0576 \u0570\u0561\u0574\u0561\u056f\u0561\u0580\u0563\u056b\u0579\u0576\u0565\u0580\u056b \u056f\u0578\u0572\u0574\u056b\u0581 \u0574\u0561\u0580\u0564\u056f\u0561\u0575\u056b\u0576 \u0562\u0561\u0576\u0561\u056f\u0561\u0576\u0578\u0582\u0569\u0575\u0561\u0576 \u0576\u0574\u0561\u0576\u0561\u056f\u0574\u0561\u0576 \u0563\u056b\u057f\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0576 \u0567\u0589",
  },
  {
    icon: Database,
    title: "\u0544\u0565\u0584\u0565\u0576\u0561\u0575\u0561\u056f\u0561\u0576 \u0548\u0582\u057d\u0578\u0582\u0581\u0578\u0582\u0574 (ML)",
    desc: "ML-\u0568 AI-\u056b \u0565\u0576\u0569\u0561\u0564\u0561\u0577\u057f \u0567, \u0578\u0580\u057f\u0565\u0572 \u0570\u0561\u0574\u0561\u056f\u0561\u0580\u0563\u0565\u0580\u0568 \u057d\u0578\u057e\u0578\u0580\u0578\u0582\u0574 \u0565\u0576 \u057f\u057e\u0575\u0561\u056c\u0576\u0565\u0580\u056b \u0570\u056b\u0574\u0561\u0576 \u057e\u0580\u0561\u0589",
  },
  {
    icon: Code,
    title: "Python \u053e\u0580\u0561\u0563\u0580\u0561\u057e\u0578\u0580\u0578\u0582\u0574",
    desc: "Python-\u0568 \u0561\u0574\u0565\u0576\u0561\u0570\u0561\u0575\u057f\u0576\u056b \u056e\u0580\u0561\u0563\u0580\u0561\u057e\u0578\u0580\u0574\u0561\u0576 \u056c\u0565\u0566\u0578\u0582\u0576\u0565\u0580\u056b\u0581 \u0567, \u0570\u0561\u057f\u056f\u0561\u057a\u0565\u057d AI-\u056b \u0570\u0561\u0574\u0561\u0580\u0589",
  },
  {
    icon: Globe,
    title: "Web \u053e\u0580\u0561\u0563\u0580\u0561\u057e\u0578\u0580\u0578\u0582\u0574",
    desc: "HTML5, CSS3, JavaScript, Responsive Design \u0587 \u056b\u0580\u0561\u056f\u0561\u0576 \u057e\u0565\u0562 \u0576\u0561\u056d\u0561\u0563\u056e\u0565\u0580\u0589",
  },
  {
    icon: Calculator,
    title: "\u0544\u0561\u0569\u0565\u0574\u0561\u057f\u056b\u056f\u0561",
    desc: "\u0533\u056e\u0561\u0575\u056b\u0576 \u0570\u0561\u0576\u0580\u0561\u0570\u0561\u0577\u056b\u057e, \u0570\u0561\u057e\u0561\u0576\u0561\u056f\u0561\u0576\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0576\u0565\u0580, \u057e\u056b\u0573\u0561\u056f\u0561\u0563\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576 \u0587 \u0564\u056b\u057d\u056f\u0580\u0565\u057f \u0574\u0561\u0569\u0565\u0574\u0561\u057f\u056b\u056f\u0561\u0589",
  },
  {
    icon: Box,
    title: "3ds Max",
    desc: "3D \u0574\u0578\u0564\u0565\u056c\u0561\u057e\u0578\u0580\u0578\u0582\u0574, \u0561\u0576\u056b\u0574\u0561\u0581\u056b\u0561 \u0587 \u057e\u056b\u0566\u0578\u0582\u0561\u056c\u056b\u0566\u0561\u0581\u056b\u0561\u0589",
  },
  {
    icon: BarChart3,
    title: "\u054f\u057e\u0575\u0561\u056c\u0576\u0565\u0580\u056b \u054e\u056b\u0566\u0578\u0582\u0561\u056c\u056b\u0566\u0561\u0581\u056b\u0561",
    desc: "Matplotlib, Seaborn \u0587 Tableau \u0563\u0578\u0580\u056e\u056b\u0584\u0576\u0565\u0580\u0578\u057e \u057f\u057e\u0575\u0561\u056c\u0576\u0565\u0580\u056b \u057e\u056b\u0566\u0578\u0582\u0561\u056c\u056b\u0566\u0561\u0581\u056b\u0561\u0589",
  },
  {
    icon: Camera,
    title: "\u053c\u0578\u0582\u057d\u0561\u0576\u056f\u0561\u0580\u0579\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
    desc: "\u053f\u0578\u0574\u057a\u0578\u0566\u056b\u0581\u056b\u0561, \u056c\u0578\u0582\u057d\u0561\u057e\u0578\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576, \u056f\u0561\u0564\u0580\u0561\u057e\u0578\u0580\u0578\u0582\u0574 \u0587 \u0570\u0565\u057f\u0574\u0577\u0561\u056f\u0578\u0582\u0574\u0589",
  },
];

const CoursesSection = () => {
  return (
    <section id="courses" className="py-24 bg-dark-surface">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {"\u053b\u0576\u0579\u0578\u057e \u0565\u0576\u0584 \u0574\u0565\u0576\u0584 "}<span className="text-gradient-gold">{"\u0566\u0562\u0561\u0572\u057e\u0578\u0582\u0574"}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {"\u0544\u0565\u0580 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568 \u0561\u0576\u0581\u056f\u0561\u0581\u0576\u0578\u0582\u0574 \u0565\u0576 \u0578\u056c\u0578\u0580\u057f\u056b \u0583\u0578\u0580\u0571\u0561\u0563\u0565\u057f\u0576\u0565\u0580\u0568"}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, i) => (
            <motion.div
              key={course.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-xl p-6 hover:border-primary/40 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <course.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{course.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{course.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
