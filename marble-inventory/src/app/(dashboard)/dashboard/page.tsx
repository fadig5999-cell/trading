import { getDashboardStats, getMarbleTypes } from '@/lib/actions';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StockBadge } from '@/components/ui/Badge';
import { getStockStatus } from '@/lib/types';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default async function DashboardPage() {
  const [stats, marbles] = await Promise.all([
    getDashboardStats(),
    getMarbleTypes(),
  ]);

  const lowStockItems = marbles.filter(m => m.quantity > 0 && m.quantity < 3);
  const soldOutItems = marbles.filter(m => m.quantity === 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">לוח בקרה</h1>
        <p className="text-sm text-zinc-500 mt-1">סקירה כללית של מלאי השיש</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lowStockItems.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-zinc-900">מלאי נמוך</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockItems.map(item => (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{item.hebrew_name}</p>
                    <p className="text-xs text-zinc-400">{item.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-600">{item.quantity}</span>
                    <StockBadge status={getStockStatus(item.quantity)} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {soldOutItems.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-zinc-900">אזל מהמלאי</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {soldOutItems.map(item => (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <p className="font-medium text-zinc-900">{item.hebrew_name}</p>
                  <StockBadge status="sold_out" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-center">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          עבור למלאי
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
