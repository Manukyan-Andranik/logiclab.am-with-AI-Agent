import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  const scrollToSection = (sectionId: string) => {
    setIsOpen(false);
    if (isHome) {
      document.querySelector(sectionId)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = `/${sectionId}`;
    }
  };

  const navLinks = [
    { label: "\u0533\u056c\u056d\u0561\u057e\u0578\u0580", to: "/", isRoute: true },
    { label: "\u0534\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580", to: "/courses", isRoute: true },
    { label: "\u0544\u0565\u0580 \u0574\u0561\u057d\u056b\u0576", section: "#about" },
    { label: "\u053f\u0561\u057a", section: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 font-display text-xl font-bold">
          <span className="text-gradient-gold">Logic</span>
          <span className="text-foreground">Lab</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) =>
            item.isRoute ? (
              <Link
                key={item.to}
                to={item.to!}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.section}
                onClick={() => scrollToSection(item.section!)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            )
          )}
          <Link
            to="/courses"
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:brightness-110 transition"
          >
            {"\u0534\u056b\u057f\u0565\u056c \u0564\u0561\u057d\u0568\u0576\u0569\u0561\u0581\u0576\u0565\u0580\u0568"}
          </Link>
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
              {navLinks.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.to}
                    to={item.to!}
                    onClick={() => setIsOpen(false)}
                    className="text-left text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.section}
                    onClick={() => scrollToSection(item.section!)}
                    className="text-left text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
