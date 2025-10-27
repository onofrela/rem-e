'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/40 backdrop-blur-md border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'green' ? 'orange' : 'green'} theme`}
    >
      {/* Animated background indicator */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: theme === 'green'
            ? 'radial-gradient(circle, rgba(171, 211, 159, 0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(250, 133, 2, 0.3) 0%, transparent 70%)'
        }}
      />

      {/* Icon container with rotation animation */}
      <div className="relative text-2xl md:text-3xl transition-transform duration-500" style={{
        transform: theme === 'green' ? 'rotate(0deg)' : 'rotate(180deg)'
      }}>
        {theme === 'green' ? '🌿' : '🍊'}
      </div>
    </button>
  );
};
