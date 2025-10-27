import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputStyles = `
      w-full px-4 py-3
      bg-[var(--color-background)]
      border-2 border-[var(--color-border)]
      rounded-xl
      text-[var(--color-text-primary)]
      placeholder:text-[var(--color-text-tertiary)]
      transition-all duration-200
      focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const errorStyles = error
      ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/20'
      : '';

    const hasLeftIcon = leftIcon ? 'pl-12' : '';
    const hasRightIcon = rightIcon ? 'pr-12' : '';

    return (
      <div className={`flex flex-col gap-2 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="text-sm font-medium text-[var(--color-text-primary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              ${inputStyles}
              ${errorStyles}
              ${hasLeftIcon}
              ${hasRightIcon}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <span className="text-sm text-[var(--color-error)]">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
