'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/ui/Logo';
import {
  Home,
  UtensilsCrossed,
  Package,
  BookOpen,
  Calendar,
  Settings,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Inicio', icon: Home, href: '/' },
  { id: 'cook', label: 'Cocinar', icon: UtensilsCrossed, href: '/cook' },
  { id: 'inventory', label: 'Inventario', icon: Package, href: '/inventory' },
  { id: 'recipes', label: 'Recetas', icon: BookOpen, href: '/recipes' },
  { id: 'plan', label: 'Planificar', icon: Calendar, href: '/plan' },
  { id: 'settings', label: 'Ajustes', icon: Settings, href: '/settings' },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* Header Bar with Hamburger Button and Logo - Semi-Glass */}
      <div className="flex items-center h-20 px-4">
        {/* Hamburger Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="
            p-3
            text-[var(--color-text-primary)]
            hover:bg-white/40
            rounded-xl
            transition-all duration-200
          "
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMenuOpen}
        >
          <div className="w-6 h-5 flex flex-col justify-between">
            <span
              className={`
                block h-0.5 w-full bg-current rounded-full
                transition-all duration-300 ease-in-out origin-center
                ${isMenuOpen ? 'rotate-45 translate-y-2' : 'rotate-0'}
              `}
            />
            <span
              className={`
                block h-0.5 w-full bg-current rounded-full
                transition-all duration-300 ease-in-out
                ${isMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}
              `}
            />
            <span
              className={`
                block h-0.5 w-full bg-current rounded-full
                transition-all duration-300 ease-in-out origin-center
                ${isMenuOpen ? '-rotate-45 -translate-y-2' : 'rotate-0'}
              `}
            />
          </div>
        </button>

        {/* Logo/Brand with glass effect */}
        <div className="flex items-center gap-3 ml-4 px-4 py-2 bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 shadow-sm">
          <Logo size={28} className="text-[var(--color-primary)]" />
          <span className="text-xl font-bold text-[var(--color-primary)]">
            Rem-E
          </span>
        </div>

        {/* Theme Toggle - positioned on the right */}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Backdrop with blur - animated */}
      <div
        className={`
          fixed inset-0 z-[var(--z-overlay)]
          bg-black/60 backdrop-blur-md
          transition-all duration-300 ease-in-out
          ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsMenuOpen(false)}
        style={{
          animation: isMenuOpen ? 'fadeIn 0.3s ease-in-out' : 'fadeOut 0.3s ease-in-out'
        }}
      />

      {/* Menu Panel - slides from left with improved glass effect */}
      <nav
        className={`
          fixed top-0 left-0 bottom-0 z-[var(--z-modal)]
          w-80 max-w-[85vw]
          bg-gradient-to-b from-white/95 via-[rgba(245,250,243,0.95)] to-white/95
          backdrop-blur-xl
          border-r border-[var(--color-primary)]/20
          shadow-[4px_0_32px_rgba(151,194,138,0.2)]
          transition-transform duration-300 ease-in-out
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          safe-area-left safe-area-top safe-area-bottom
        `}
        style={{
          animation: isMenuOpen ? 'slideInLeft 0.3s ease-out' : 'slideOutLeft 0.3s ease-in'
        }}
      >
        <div className="flex flex-col h-full px-6 py-8">
          {/* Logo/Brand in menu */}
          <div
            className="flex items-center justify-between mb-8"
            style={{
              animation: isMenuOpen ? 'fadeIn 0.4s ease-out 0.1s backwards' : 'none'
            }}
          >
            <div className="flex items-center gap-3">
              <Logo size={36} className="text-[var(--color-primary)]" />
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                Rem-E
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-2 rounded-xl hover:bg-white/30"
              aria-label="Cerrar menú"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Nav Items with staggered animation */}
          <div className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              // Add separator before "Ajustes"
              const showSeparator = item.id === 'settings';

              return (
                <React.Fragment key={item.id}>
                  {showSeparator && (
                    <div
                      className="my-3 mx-4 border-t border-[var(--color-primary)]/15"
                      style={{
                        animation: isMenuOpen ? `fadeIn 0.3s ease-out ${0.1 + index * 0.05}s backwards` : 'none'
                      }}
                    />
                  )}
                  <Link
                    href={item.href}
                    className={`
                      relative flex items-center gap-4
                      px-5 py-4
                      rounded-2xl
                      transition-all duration-200
                      ${
                        active
                          ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30'
                          : 'text-[var(--color-text-primary)] hover:bg-white/60 hover:shadow-md'
                      }
                    `}
                    style={{
                      animation: isMenuOpen ? `fadeIn 0.3s ease-out ${0.1 + index * 0.05}s backwards` : 'none'
                    }}
                  >
                    {/* iOS-style active indicator bar */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                    )}

                    {/* Icon with filled style */}
                    <Icon
                      className={`w-6 h-6 ${active ? 'fill-white' : 'fill-[var(--color-primary)]'}`}
                      strokeWidth={0}
                    />

                    <span className={`text-lg font-semibold ${active ? 'text-white' : 'text-[var(--color-text-primary)]'}`}>
                      {item.label}
                    </span>
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};
