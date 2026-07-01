"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { logout } from "@/lib/actions/auth";
import { NAV_LINKS } from "@/lib/constants";
import { LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

export function AppShell({
  children,
  fullName,
  role,
}: {
  children: ReactNode;
  fullName: string;
  role: "admin" | "viewer";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = NAV_LINKS.find(
    (l) => pathname === l.href || pathname.startsWith(l.href + "/")
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[85%] animate-fade-in">
            <div className="relative h-full">
              <button
                onClick={() => setOpen(false)}
                className="absolute end-3 top-4 z-10 rounded-lg p-1.5 text-chrome-300 hover:bg-white/10"
                aria-label="סגור תפריט"
              >
                <X size={20} />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-chrome-200 bg-white/80 px-4 py-3.5 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-chrome-700 hover:bg-chrome-100 lg:hidden"
              aria-label="פתח תפריט"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-chrome-900 sm:text-lg">
              {current?.label ?? ""}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <p className="text-sm font-medium text-chrome-800">{fullName}</p>
              <p className="text-xs text-muted">
                {role === "admin" ? "מנהל מערכת" : "צפייה בלבד"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-chrome-200 to-chrome-400 text-sm font-semibold text-chrome-800 ring-1 ring-chrome-300">
              {fullName.slice(0, 1)}
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg p-2 text-chrome-500 hover:bg-chrome-100 hover:text-danger"
                aria-label="התנתקות"
                title="התנתקות"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
