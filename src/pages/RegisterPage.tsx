import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import VideoHero from "@/components/VideoHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { coursesData } from "@/data/courses";
import coursesVideo from "@/assets/courses-hero-video.mp4";

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedCourse = searchParams.get("course") || "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    course: preselectedCourse,
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto px-6"
          >
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              {"\u0547\u0576\u0578\u0580\u0570\u0561\u056f\u0561\u056c\u0578\u0582\u0569\u0575\u0578\u0582\u0576!"}
            </h2>
            <p className="text-muted-foreground mb-8">
              {"\u0541\u0565\u0580 \u0570\u0561\u0575\u057f\u0568 \u0570\u0561\u057b\u0578\u0572\u0578\u0582\u0569\u0575\u0561\u0574\u0562 \u0578\u0582\u0572\u0561\u0580\u056f\u057e\u0565\u0581\u0589 \u0544\u0565\u0576\u0584 \u056f\u056f\u0561\u057a\u057e\u0565\u0576\u0584 \u0571\u0565\u0566 \u0570\u0565\u057f \u0577\u0578\u0582\u057f\u0578\u057e\u0589"}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:brightness-110 transition"
            >
              {"\u0533\u056c\u056d\u0561\u057e\u0578\u0580"}
            </Link>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <VideoHero
        videoSrc={coursesVideo}
        titleHighlight={"\u0533\u0580\u0561\u0576\u0581\u057e\u0565\u056c"}
        title={"\u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u056b\u0576"}
        subtitle={"\u053c\u0580\u0561\u0581\u0580\u0565\u0584 \u0571\u0565\u057e\u0568 \u0587 \u0574\u0565\u0576\u0584 \u056f\u056f\u0561\u057a\u057e\u0565\u0576\u0584 \u0571\u0565\u0566 \u0570\u0565\u057f"}
      />

      <section className="py-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 sm:p-10 space-y-6"
          >
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {"\u0533\u0580\u0561\u0576\u0581\u0574\u0561\u0576 \u0571\u0587"}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{"\u0531\u0576\u0578\u0582\u0576"}</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{"\u0531\u0566\u0563\u0561\u0576\u0578\u0582\u0576"}</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{"\u0540\u0565\u057c\u0561\u056d\u0578\u057d\u0561\u0570\u0561\u0574\u0561\u0580"}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{"\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581"}</label>
              <select
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value="">{"\u0538\u0576\u057f\u0580\u0565\u0584 \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0568"}</option>
                {coursesData.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{"\u0540\u0561\u0572\u0578\u0580\u0564\u0561\u0563\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576 (\u056f\u0561\u0574\u0561\u057e\u0578\u0580)"}</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-lg font-semibold hover:brightness-110 transition flex items-center justify-center gap-2 glow-gold"
            >
              <Send className="w-4 h-4" />
              {"\u0548\u0582\u0572\u0561\u0580\u056f\u0565\u056c"}
            </button>
          </motion.form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RegisterPage;
