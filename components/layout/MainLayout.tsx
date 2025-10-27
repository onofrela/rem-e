'use client';

import React from 'react';
import { Navbar } from './Navbar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="grid grid-rows-[auto_1fr] h-screen bg-gradient-to-b from-[var(--color-accent)] to-[var(--color-background)]">
      <header className="sticky top-0 z-[var(--z-fixed)]">
        <Navbar />
      </header>
      <main className="overflow-auto">
        {children}
      </main>
    </div>
  );
};
