import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-full
    whitespace-nowrap
  `;

  const variantStyles = {
    default: 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]',
    success: 'bg-[var(--color-success)] text-white',
    warning: 'bg-[var(--color-warning)] text-white',
    error: 'bg-[var(--color-error)] text-white',
    info: 'bg-[var(--color-primary)] text-white',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
