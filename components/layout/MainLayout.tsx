'use client';

import React from 'react';
import { Navbar } from './Navbar';
import { VoiceAssistant } from '@/components/voice';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="relative h-screen overflow-hidden" style={{ backgroundColor: '#EFE8E0' }}>
      <div className="relative h-full grid grid-rows-[80px_1fr]">
        <header className="h-20">
          <Navbar />
        </header>
        <main className="overflow-auto flex flex-col">
          {children}
        </main>
      </div>
      {/* Voice Assistant Widget */}
      <VoiceAssistant />
    </div>
  );
};