import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    low_stock: "bg-amber-50 text-amber-700 ring-amber-600/20",
    out_of_stock: "bg-rose-50 text-rose-700 ring-rose-600/20",
  };
  return <Badge className={styles[status] ?? styles.in_stock}>{label}</Badge>;
}
