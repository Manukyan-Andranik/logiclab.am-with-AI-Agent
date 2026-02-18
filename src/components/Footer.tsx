const Footer = () => {
  return (
    <footer className="py-8 border-t border-border">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 font-display text-lg font-bold">
          <span className="text-gradient-gold">Logic</span>
          <span className="text-foreground">Lab</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Logic Lab. All rights reserved.
        </p>
        <div className="flex gap-4">
          <a href="https://www.linkedin.com/company/logiclabacademy/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">LinkedIn</a>
          <a href="https://www.instagram.com/logic_lab_academy/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">Instagram</a>
          <a href="https://www.facebook.com/LogicLabruary" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">Facebook</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
