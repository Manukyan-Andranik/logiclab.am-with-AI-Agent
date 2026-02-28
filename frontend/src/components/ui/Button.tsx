import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  disabled,
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wider transition-[all_0.3s_cubic-bezier(0.25,0.8,0.25,1)] disabled:opacity-50 disabled:cursor-not-allowed rounded-full";
  
  const variants = {
    primary: "bg-[var(--primary)] text-[var(--black)] hover:bg-[var(--primary-alt)]",
    secondary: "bg-[var(--blue)] text-[var(--white)] hover:bg-[var(--teal)]",
    outline: "border-2 border-[var(--white)] text-[var(--white)] hover:bg-[var(--white)] hover:text-[var(--black)]",
    ghost: "bg-transparent text-[var(--white)] hover:bg-[var(--gray-dark)]",
    danger: "bg-[var(--danger)] text-[var(--white)] hover:opacity-90"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-8 py-4 text-sm",
    lg: "px-10 py-5 text-base",
    icon: "h-10 w-10 p-0"
  };

  return (
    <button 
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
