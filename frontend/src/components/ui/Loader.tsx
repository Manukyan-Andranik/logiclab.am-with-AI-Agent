import React from 'react';

interface LoaderProps {
  size?: number;
  className?: string;
}

const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(({ size = 24, className = '' }, ref) => {
  return (
    <div ref={ref} className={`flex items-center justify-center ${className}`}>
      <div 
        className="animate-spin rounded-full border-t-2 border-[var(--primary)] border-r-2 border-transparent"
        style={{ width: size, height: size }}
      ></div>
    </div>
  );
});

Loader.displayName = 'Loader';

export default Loader;
