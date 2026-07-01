'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Image,
  BarChart3,
  Settings,
  LogOut,
  Gem,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/inventory', label: 'מלאי', icon: Package },
  { href: '/sales', label: 'מכירות', icon: ShoppingCart },
  { href: '/gallery', label: 'גלריה', icon: Image },
  { href: '/reports', label: 'דוחות', icon: BarChart3 },
  { href: '/settings', label: 'הגדרות', icon: Settings },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-l border-zinc-100 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center shadow-lg">
          <Gem className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900">ניהול מלאי שיש</h1>
          <p className="text-xs text-zinc-500">מערכת ניהול מקצועית</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-zinc-900 text-white shadow-md'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-100">
        <div className="px-4 py-2 mb-2">
          <span className="text-xs text-zinc-400">
            {role === 'admin' ? 'מנהל' : 'צופה'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          התנתק
        </button>
      </div>
    </aside>
  );
}
