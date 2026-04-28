import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg",
  {
    variants: {
      variant: {
        primary:  "bg-primary text-primary-foreground hover:bg-[#FFC000] active:scale-[0.98]",
        secondary:"bg-[#0077B5] text-white hover:bg-[#005e8c] active:scale-[0.98]",
        outline:  "border-2 border-border text-foreground hover:bg-secondary hover:border-primary hover:text-primary",
        ghost:    "bg-transparent text-foreground hover:bg-secondary",
        danger:   "bg-[#dc3545] text-white hover:bg-[#c82333] active:scale-[0.98]",
      },
      size: {
        sm:      "px-4 py-2 text-xs",
        md:      "px-8 py-4 text-sm",
        lg:      "px-10 py-5 text-base",
        icon:    "h-10 w-10 p-0",
        default: "px-8 py-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "primary", size = "md", fullWidth = false, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), fullWidth && "w-full", className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button as default, buttonVariants, type ButtonProps };
