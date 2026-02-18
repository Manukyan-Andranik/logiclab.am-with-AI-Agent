import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Signal } from "lucide-react";
import { coursesData } from "@/data/courses";

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
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <course.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{course.shortDesc}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Signal className="w-3 h-3 text-primary" />
                    {course.level}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  {"\u0544\u0561\u0576\u0580\u0561\u0574\u0561\u057d\u0576\u0565\u0580"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-semibold hover:brightness-110 transition"
          >
            {"\u0532\u0578\u056c\u0578\u0580 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CoursesSection;
