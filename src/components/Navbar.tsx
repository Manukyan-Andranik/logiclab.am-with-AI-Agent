import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollTo = (href: string) => {
    setIsOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  const links = [
    { label: "\u0533\u056c\u056d\u0561\u057e\u0578\u0580", href: "#hero" },
    { label: "\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580", href: "#courses" },
    { label: "\u0544\u0565\u0580 \u0574\u0561\u057d\u056b\u0576", href: "#about" },
    { label: "\u053f\u0561\u057a", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-1 font-display text-xl font-bold">
          <span className="text-gradient-gold">Logic</span>
          <span className="text-foreground">Lab</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((item) => (
            <button
              key={item.href}
              onClick={() => scrollTo(item.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => scrollTo("#courses")}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:brightness-110 transition"
          >
            {"\u0534\u056b\u057f\u0565\u056c \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568"}
          </button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {links.map((item) => (
                <button
                  key={item.href}
                  onClick={() => scrollTo(item.href)}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
