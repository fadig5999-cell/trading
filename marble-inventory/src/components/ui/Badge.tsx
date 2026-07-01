import { clsx } from 'clsx';
import type { StockStatus } from '@/lib/types';
import { getStockStatusLabel } from '@/lib/types';

interface BadgeProps {
  status: StockStatus;
  className?: string;
}

const statusStyles: Record<StockStatus, string> = {
  in_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  low_stock: 'bg-amber-50 text-amber-700 border-amber-200',
  sold_out: 'bg-red-50 text-red-700 border-red-200',
};

export function StockBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {getStockStatusLabel(status)}
    </span>
  );
}

export function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode;
  variant?: 'default' | 'primary';
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variant === 'default' && 'bg-zinc-100 text-zinc-700',
        variant === 'primary' && 'bg-zinc-800 text-white',
        className
      )}
    >
      {children}
    </span>
  );
}
