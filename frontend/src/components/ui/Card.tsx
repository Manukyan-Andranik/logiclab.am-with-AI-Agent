import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, className = '', hoverable = true }, ref) => {
  return (
    <div 
      ref={ref}
      className={`bg-[var(--gray-dark)] border border-[var(--gray-dark)] rounded-[30px] p-6 transition-[all_0.3s_cubic-bezier(0.25,0.8,0.25,1)] ${hoverable ? 'hover:border-[var(--primary)] hover:-translate-y-1' : ''} ${className}`}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
