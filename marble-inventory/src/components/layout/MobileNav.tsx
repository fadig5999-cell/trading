'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Image,
  BarChart3,
  Menu,
  Gem,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/inventory', label: 'מלאי', icon: Package },
  { href: '/sales', label: 'מכירות', icon: ShoppingCart },
  { href: '/gallery', label: 'גלריה', icon: Image },
  { href: '/reports', label: 'דוחות', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
              <Gem className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-900">ניהול מלאי שיש</span>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-zinc-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute top-0 right-0 w-64 h-full bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-100">
              <span className="text-sm font-bold">תפריט</span>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                      isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-100 shadow-lg">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive ? 'text-zinc-900' : 'text-zinc-400'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive && 'text-zinc-900')} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
