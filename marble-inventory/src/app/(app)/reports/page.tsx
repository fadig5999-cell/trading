import { StatCard } from "@/components/dashboard/StatCard";
import { MonthlySalesChart, TopSoldChart } from "@/components/reports/ReportsCharts";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { STATUS_LABELS } from "@/lib/constants";
import { getMarbleTypes, getSales } from "@/lib/data";
import {
  formatCurrency,
  getStockStatus,
  inventoryValue,
} from "@/lib/utils";
import { AlertTriangle, Boxes, ReceiptText, Wallet } from "lucide-react";

export default async function ReportsPage() {
  const [items, sales] = await Promise.all([getMarbleTypes(), getSales()]);

  const soldByType = new Map<string, { name: string; quantity: number }>();
  for (const sale of sales) {
    const key = sale.marble_type_id;
    const name = sale.marble_type?.name_he ?? "פריט שנמחק";
    const existing = soldByType.get(key);
    if (existing) {
      existing.quantity += sale.quantity;
    } else {
      soldByType.set(key, { name, quantity: sale.quantity });
    }
  }
  const topSold = Array.from(soldByType.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  const monthlyMap = new Map<string, { quantity: number; revenue: number }>();
  const monthFormatter = new Intl.DateTimeFormat("he-IL", {
    month: "short",
    year: "2-digit",
  });
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(monthFormatter.format(d), { quantity: 0, revenue: 0 });
  }
  for (const sale of sales) {
    const d = new Date(sale.sold_at);
    const key = monthFormatter.format(d);
    if (monthlyMap.has(key)) {
      const entry = monthlyMap.get(key)!;
      entry.quantity += sale.quantity;
      entry.revenue += (sale.sale_price ?? 0) * sale.quantity;
    }
  }
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({
    month,
    ...v,
  }));

  const lowStockItems = items.filter(
    (i) => getStockStatus(i) !== "in_stock"
  );
  const totalSoldAllTime = sales.reduce((sum, s) => sum + s.quantity, 0);
  const totalValue = inventoryValue(items);
  const totalRevenue = sales.reduce(
    (sum, s) => sum + (s.sale_price ?? 0) * s.quantity,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-chrome-900">דוחות וניתוח מלאי</h2>
        <p className="text-sm text-muted">תמונת מצב עסקית לתמיכה בקבלת החלטות</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="סה&quot;כ לוחות שנמכרו" value={totalSoldAllTime} icon={ReceiptText} />
        <StatCard
          label="הכנסה כוללת ממכירות"
          value={formatCurrency(totalRevenue)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="שווי מלאי נוכחי"
          value={formatCurrency(totalValue)}
          icon={Boxes}
          tone="accent"
        />
        <StatCard
          label="פריטים במלאי נמוך / אזל"
          value={lowStockItems.length}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>סוגי השיש הנמכרים ביותר</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TopSoldChart data={topSold} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>מכירות חודשיות (6 חודשים אחרונים)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MonthlySalesChart data={monthlyData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>רשימת מלאי נמוך / אזל מהמלאי</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {lowStockItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              כל הפריטים במלאי תקין — אין התראות כרגע
            </p>
          ) : (
            <div className="divide-y divide-chrome-200">
              {lowStockItems.map((item) => {
                const status = getStockStatus(item);
                return (
                  <a
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-chrome-100/40"
                  >
                    <div>
                      <p className="text-sm font-medium text-chrome-900">
                        {item.name_he}
                      </p>
                      <p className="text-xs text-muted">
                        {item.quantity} יח&apos; · {item.location || "לא צוין מיקום"}
                      </p>
                    </div>
                    <StatusBadge status={status} label={STATUS_LABELS[status]} />
                  </a>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
