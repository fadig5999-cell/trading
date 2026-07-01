import { getSales } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export default async function SalesPage() {
  const sales = await getSales();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">מכירות</h1>
        <p className="text-sm text-zinc-500 mt-1">היסטוריית מכירות לוחות שיש</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>אין מכירות עדיין</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">תאריך</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">שעה</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">סוג שיש</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">כמות</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">מחיר</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500 hidden md:table-cell">לקוח</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500 hidden lg:table-cell">טלפון</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500 hidden lg:table-cell">הערות</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="py-3 px-4">{formatDate(sale.sale_date)}</td>
                      <td className="py-3 px-4" dir="ltr">{formatTime(sale.sale_time)}</td>
                      <td className="py-3 px-4 font-medium">
                        {sale.marble_types?.hebrew_name || '—'}
                      </td>
                      <td className="py-3 px-4">{sale.quantity_sold}</td>
                      <td className="py-3 px-4">{formatCurrency(sale.price)}</td>
                      <td className="py-3 px-4 hidden md:table-cell">{sale.customer_name || '—'}</td>
                      <td className="py-3 px-4 hidden lg:table-cell" dir="ltr">{sale.customer_phone || '—'}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-zinc-500">{sale.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
