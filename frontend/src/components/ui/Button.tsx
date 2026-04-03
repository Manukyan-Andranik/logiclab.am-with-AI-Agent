import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Define buttonVariants using CVA for consistent styling across components
const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold uppercase tracking-wider transition-[all_0.3s_cubic-bezier(0.25,0.8,0.25,1)] disabled:opacity-50 disabled:cursor-not-allowed rounded-full",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-alt",
        secondary: "bg-blue text-white hover:bg-teal",
        outline: "border-2 border-white text-white hover:bg-white hover:text-black",
        ghost: "bg-transparent text-white hover:bg-gray-dark",
        danger: "bg-danger text-white hover:opacity-90"
      },
      size: {
        sm: "px-4 py-2 text-xs",
        md: "px-8 py-4 text-sm",
        lg: "px-10 py-5 text-base",
        icon: "h-10 w-10 p-0",
        default: "px-8 py-4 text-sm" // Alias for md
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          className
        )}
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
