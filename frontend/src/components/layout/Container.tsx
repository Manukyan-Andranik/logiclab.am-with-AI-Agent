import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container: React.FC<ContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`max-w-[1200px] mx-auto px-5 md:px-10 w-full ${className}`}>
      {children}
    </div>
  );
};

export default Container;
