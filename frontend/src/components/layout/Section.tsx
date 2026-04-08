import React from 'react';

interface SectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
  dark?: boolean;
}

const Section: React.FC<SectionProps> = ({ id, className = '', children, dark = false }) => {
  return (
    <section 
      id={id} 
      className={`py-[100px] md:py-[60px] ${dark ? 'bg-[var(--gray-dark)]' : 'bg-[var(--black)]'} ${className}`}
      style={{ transition: 'var(--transition)' }}
    >
      {children}
    </section>
  );
};

export default Section;
