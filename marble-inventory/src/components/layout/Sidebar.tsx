"use client";

import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Boxes,
  Gem,
  Image as ImageIcon,
  LayoutDashboard,
  Receipt,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Boxes,
  Receipt,
  Image: ImageIcon,
  BarChart3,
  Settings,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-chrome-900 text-chrome-200">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chrome-100 to-chrome-300 shadow-md">
          <Gem size={18} className="text-chrome-800" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">ניהול מלאי שיש</p>
          <p className="text-[11px] text-chrome-500">מערכת ניהול אולם תצוגה</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_LINKS.map((link) => {
          const Icon = ICONS[link.icon];
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-chrome-400 hover:bg-white/5 hover:text-chrome-100"
              )}
            >
              <Icon size={18} className={active ? "text-accent" : ""} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 text-center text-[11px] text-chrome-600">
        גרסה 1.0 · Marble Suite
      </div>
    </div>
  );
}
