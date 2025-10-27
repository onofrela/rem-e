'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const navItems: NavItem[] = [
  { id: 'cook', label: 'Cocinar', icon: '🍽', href: '/cook' },
  { id: 'inventory', label: 'Inventario', icon: '🥫', href: '/inventory' },
  { id: 'home', label: 'Inicio', icon: '🏠', href: '/' },
  { id: 'recipes', label: 'Recetas', icon: '📖', href: '/recipes' },
  { id: 'plan', label: 'Planificar', icon: '📅', href: '/plan' },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[var(--z-fixed)] bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-1
                  min-w-[64px] h-full
                  transition-colors duration-200
                  ${active
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }
                `}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Tablet/Desktop Side Rail */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-[var(--z-fixed)] w-20 lg:w-64 bg-[var(--color-surface-elevated)] border-r border-[var(--color-border)] flex-col safe-area-left safe-area-top safe-area-bottom">
        {/* Logo/Brand */}
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-[var(--color-border)]">
          <span className="text-2xl">🍳</span>
          <span className="hidden lg:inline ml-3 text-xl font-bold text-[var(--color-primary)]">
            Rem-E
          </span>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-6">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex items-center gap-4
                  h-14 mb-2 mx-2 px-4
                  rounded-xl
                  transition-all duration-200
                  ${active
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
                  }
                `}
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <span className="hidden lg:inline font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Settings Link */}
        <div className="p-2 border-t border-[var(--color-border)]">
          <Link
            href="/settings"
            className={`
              flex items-center gap-4
              h-14 px-4
              rounded-xl
              transition-all duration-200
              ${pathname === '/settings'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            <span className="text-2xl flex-shrink-0">⚙️</span>
            <span className="hidden lg:inline font-medium">Ajustes</span>
          </Link>
        </div>
      </nav>

      {/* Spacer to prevent content from going under navbar */}
      <div className="md:hidden h-16" />
      <div className="hidden md:block w-20 lg:w-64 flex-shrink-0" />
    </>
  );
};
