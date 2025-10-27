'use client';

import React from 'react';
import { Navbar } from './Navbar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Navbar />
      <main className="flex-1 md:ml-0">
        {children}
      </main>
    </div>
  );
};
