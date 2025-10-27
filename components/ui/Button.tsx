import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon,
      iconPosition = 'left',
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-full
      transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-95
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `;

    const variantStyles = {
      primary: `
        bg-[var(--color-primary)] text-white
        hover:bg-[var(--color-primary-dark)]
        focus:ring-[var(--color-primary)]
        shadow-md hover:shadow-lg
      `,
      secondary: `
        bg-[var(--color-secondary)] text-white
        hover:bg-[var(--color-secondary-dark)]
        focus:ring-[var(--color-secondary)]
        shadow-md hover:shadow-lg
      `,
      ghost: `
        bg-transparent text-[var(--color-text-primary)]
        border-2 border-[var(--color-border)]
        hover:bg-[var(--color-surface)]
        focus:ring-[var(--color-primary)]
      `,
      danger: `
        bg-[var(--color-error)] text-white
        hover:bg-[var(--color-error-light)]
        focus:ring-[var(--color-error)]
        shadow-md hover:shadow-lg
      `,
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm min-h-[40px]',
      md: 'px-6 py-3 text-base min-h-[48px]',
      lg: 'px-8 py-4 text-lg min-h-[56px]',
      xl: 'px-10 py-5 text-xl min-h-[64px]',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthClass}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
