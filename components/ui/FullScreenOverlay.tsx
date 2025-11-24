/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useEffect } from 'react';
import { Card } from './Card';

interface FullScreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

/**
 * Full-screen overlay component for app-like navigation flows
 * Slides in from bottom with smooth animations
 */
export function FullScreenOverlay({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  className = '',
}: FullScreenOverlayProps) {
  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-background)] animate-fadeIn">
      {/* Header */}
      <div className="bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border-b border-[var(--color-border)] px-4 py-4 md:px-6 md:py-5">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Cerrar"
            >
              ←
            </button>
          )}
          <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] flex-1 text-center">
            {title}
          </h1>
          {showCloseButton && <div className="w-10" />} {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div
        className={`
          h-[calc(100vh-73px)] md:h-[calc(100vh-81px)]
          overflow-y-auto
          animate-slideInUp
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
}
