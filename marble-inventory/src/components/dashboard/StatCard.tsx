import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success" | "accent";
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "from-chrome-100 to-chrome-200 text-chrome-800",
    warning: "from-amber-50 to-amber-100 text-amber-700",
    danger: "from-rose-50 to-rose-100 text-rose-700",
    success: "from-emerald-50 to-emerald-100 text-emerald-700",
    accent: "from-accent-soft to-accent-soft text-accent-dark",
  };

  return (
    <div className="luxury-card flex items-center gap-4 p-5">
      <div
        className={cn(
          "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner",
          toneClasses[tone]
        )}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-chrome-900 tracking-tight">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-chrome-500">{hint}</p>}
      </div>
    </div>
  );
}
