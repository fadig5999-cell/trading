import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { DashboardStats } from '@/lib/types';
import { Package, Layers, AlertTriangle, Ban, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface StatsCardsProps {
  stats: DashboardStats;
}

const statItems = [
  { key: 'totalTypes' as const, label: 'סוגי שיש', icon: Package, format: formatNumber },
  { key: 'totalSlabs' as const, label: 'לוחות במלאי', icon: Layers, format: formatNumber },
  { key: 'lowStockCount' as const, label: 'מלאי נמוך', icon: AlertTriangle, format: formatNumber, alert: true },
  { key: 'soldOutCount' as const, label: 'אזל מהמלאי', icon: Ban, format: formatNumber, alert: true },
  { key: 'soldToday' as const, label: 'נמכר היום', icon: TrendingUp, format: formatNumber },
  { key: 'soldThisMonth' as const, label: 'נמכר החודש', icon: Calendar, format: formatNumber },
  { key: 'inventoryValue' as const, label: 'שווי מלאי', icon: DollarSign, format: formatCurrency },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map(item => (
        <Card key={item.key} hover>
          <CardContent className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${
              item.alert && stats[item.key] > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-zinc-100 text-zinc-600'
            }`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{item.label}</p>
              <p className="text-xl font-bold text-zinc-900">{item.format(stats[item.key])}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
