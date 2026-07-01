import { getReports } from '@/lib/actions';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { StockBadge } from '@/components/ui/Badge';
import { getStockStatus } from '@/lib/types';
import { BarChart3, TrendingUp, Package, AlertTriangle } from 'lucide-react';

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">דוחות</h1>
        <p className="text-sm text-zinc-500 mt-1">דוחות מכירות ומלאי</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">שווי מלאי נוכחי</p>
              <p className="text-xl font-bold">{formatCurrency(reports.stockValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">הכנסות החודש</p>
              <p className="text-xl font-bold">{formatCurrency(reports.monthlyRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">לוחות שנמכרו (סה״כ)</p>
              <p className="text-xl font-bold">{formatNumber(reports.totalSoldCount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">הנמכרים ביותר</h2>
          </CardHeader>
          <CardContent>
            {reports.mostSold.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">אין נתוני מכירות</p>
            ) : (
              <div className="space-y-3">
                {reports.mostSold.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-100 text-xs font-bold flex items-center justify-center text-zinc-600">
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold">{item.count} לוחות</span>
                      <span className="text-xs text-zinc-400 mr-2">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">מלאי נמוך</h2>
            </div>
          </CardHeader>
          <CardContent>
            {reports.lowStock.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">אין פריטים במלאי נמוך</p>
            ) : (
              <div className="space-y-3">
                {reports.lowStock.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50">
                    <span className="font-medium text-sm">{item.hebrew_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-600">{item.quantity}</span>
                      <StockBadge status={getStockStatus(item.quantity)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">מכירות חודשיות</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
            <div>
              <p className="text-sm text-zinc-500">לוחות שנמכרו החודש</p>
              <p className="text-3xl font-bold text-zinc-900 mt-1">{formatNumber(reports.monthlySoldCount)}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-zinc-500">הכנסות</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(reports.monthlyRevenue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
