import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      rounded-2xl
      transition-all duration-300
    `;

    const variantStyles = {
      default: 'bg-[var(--color-primary-light)] border border-[var(--color-border)]',
      elevated: `
        bg-[var(--color-primary-light)]
        backdrop-blur-[var(--glass-blur)]
        border border-[var(--glass-border)]
        shadow-[0_8px_32px_var(--glass-shadow)]
      `,
      outlined: `
        bg-[var(--color-primary-light)]
        backdrop-blur-[var(--glass-blur)]
        border-2 border-[var(--glass-border)]
      `,
      glass: `
        bg-[var(--color-primary-light)]
        backdrop-blur-[var(--glass-blur)]
        border border-[var(--glass-border)]
        shadow-[0_8px_32px_var(--glass-shadow)]
      `,
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverStyles = hoverable
      ? `hover:bg-[var(--glass-bg-hover)]
         hover:shadow-[0_12px_40px_var(--glass-shadow)]
         hover:scale-[1.02]
         hover:border-white/40
         cursor-pointer`
      : '';

    return (
      <div
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hoverStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
