import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useState } from "react";

const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // placeholder
    alert("\u0540\u0561\u0572\u0578\u0580\u0564\u0561\u0563\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0568 \u0578\u0582\u0572\u0561\u0580\u056f\u057e\u0565\u0581!");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section id="contact" className="py-24 bg-dark-surface">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {"\u053f\u0561\u057a\u057e\u0565\u0584 "}<span className="text-gradient-gold">{"\u0574\u0565\u0566 \u0570\u0565\u057f"}</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="font-display text-2xl font-semibold text-foreground mb-6">
              {"\u053f\u0561\u057a \u0574\u0565\u0566 \u0570\u0565\u057f"}
            </h3>

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
              <span>{"\u054e\u0561\u0576\u0561\u0571\u0578\u0580, \u0540\u0561\u0575\u0561\u057d\u057f\u0561\u0576"}</span>
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
              {"\u0548\u0582\u0572\u0561\u0580\u056f\u0565\u0584 \u0570\u0561\u0572\u0578\u0580\u0564\u0561\u0563\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576"}
            </h3>
            <div>
              <input
                type="text"
                placeholder={"\u0531\u0576\u0578\u0582\u0576"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div>
              <input
                type="email"
                placeholder={"Email"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div>
              <textarea
                placeholder={"\u0540\u0561\u0572\u0578\u0580\u0564\u0561\u0563\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576"}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:brightness-110 transition flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {"\u0548\u0582\u0572\u0561\u0580\u056f\u0565\u056c"}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
