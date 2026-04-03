import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { contactApi, ContactFormData } from "@/api/contact";
import { useToast } from "@/hooks/use-toast";

const ContactSection = () => {
  const [form, setForm] = useState<ContactFormData>({ name: "", email: "", phone: "", message: "" });
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (data: ContactFormData) => contactApi.submitForm(data),
    onSuccess: () => {
      toast({
        title: "Հաջողություն",
        description: "Ձեր հաղորդագրությունը ուղարկվեց!",
      });
      setForm({ name: "", email: "", phone: "", message: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Սխալ",
        description: error.message || "Տեղի է ունեցել սխալ հաղորդագրությունը ուղարկելիս։",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <section id="contact" className="py-24">
      <div className="container mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[var(--primary-alt)] uppercase tracking-tighter">
            Կապվեք <span className="text-[var(--white)]">մեզ հետ</span>
          </h2>
        </motion.div>


        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {"Կապվեք "}<span className="text-gold">{"մեզ հետ"}</span>
          </h2>
        </motion.div> */}

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >

            <a href="mailto:info@logiclab.am" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <span>info@logiclab.am</span>
            </a>

            <a href="tel:+37494752662" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <span>094-752662</span>
            </a>

            <a href="tel:+37498367419" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <span>098-367419</span>
            </a>

            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <span>{"Վանաձոր, Հայաստան"}</span>
            </div>

            {/* Social links */}
            <div className="flex gap-4 pt-4">
              {[
                { label: "LinkedIn", href: "https://www.linkedin.com/company/logiclabacademy/" },
                { label: "Instagram", href: "https://www.instagram.com/logic_lab_academy/" },
                { label: "Facebook", href: "https://www.facebook.com/LogicLabruary" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-xl p-8 space-y-5"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              {"Ուղարկեք հաղորդագրություն"}
            </h3>

            {/* Name */}
            <div>
              <input
                type="text"
                placeholder={"Անուն"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-secondary/40 backdrop-blur-sm border border-white/20 hover:border-primary/50 focus:border-primary rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                required
              />
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder={"Email"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-secondary/40 backdrop-blur-sm border border-white/20 hover:border-primary/50 focus:border-primary rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <input
                type="tel"
                placeholder={"Հեռախոսահամար (ըստ ցանկության)"}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-secondary/40 backdrop-blur-sm border border-white/20 hover:border-primary/50 focus:border-primary rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
              />
            </div>

            {/* Message */}
            <div>
              <textarea
                placeholder={"Հաղորդագրություն"}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                className="w-full bg-secondary/40 backdrop-blur-sm border border-white/20 hover:border-primary/50 focus:border-primary rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all duration-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {mutation.isPending ? "Ուղարկվում է..." : "Ուղարկել"}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
