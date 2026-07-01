import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { getMarbleTypes, getSales } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/constants";
import {
  formatCurrency,
  formatDateTime,
  getStockStatus,
  inventoryValue,
  isSameDay,
  isSameMonth,
} from "@/lib/utils";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  CircleSlash,
  Layers,
  ReceiptText,
  Wallet,
} from "lucide-react";

export default async function DashboardPage() {
  const [marbleTypes, sales] = await Promise.all([getMarbleTypes(), getSales(8)]);

  const now = new Date();
  const totalTypes = marbleTypes.length;
  const totalSlabs = marbleTypes.reduce((sum, m) => sum + m.quantity, 0);
  const lowStockItems = marbleTypes.filter(
    (m) => getStockStatus(m) === "low_stock"
  );
  const outOfStockItems = marbleTypes.filter(
    (m) => getStockStatus(m) === "out_of_stock"
  );

  const soldToday = sales.filter((s) => isSameDay(new Date(s.sold_at), now));
  const soldTodayCount = soldToday.reduce((sum, s) => sum + s.quantity, 0);

  const allSales = await getSales();
  const soldThisMonth = allSales.filter((s) =>
    isSameMonth(new Date(s.sold_at), now)
  );
  const soldThisMonthCount = soldThisMonth.reduce((sum, s) => sum + s.quantity, 0);

  const totalValue = inventoryValue(marbleTypes);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-chrome-900">סקירה כללית</h2>
          <p className="text-sm text-muted">
            תמונת מצב עדכנית של המלאי, המכירות והפעילות באולם התצוגה
          </p>
        </div>
        <LinkButton href="/inventory/new" variant="secondary">
          הוסף סוג שיש
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="סוגי שיש במלאי"
          value={totalTypes}
          icon={Layers}
          hint="מספר קטלוגי כולל"
        />
        <StatCard
          label="לוחות במלאי"
          value={totalSlabs.toLocaleString("he-IL")}
          icon={Boxes}
          tone="accent"
          hint="סך כל הלוחות הפיזיים"
        />
        <StatCard
          label="מלאי נמוך"
          value={lowStockItems.length}
          icon={AlertTriangle}
          tone="warning"
          hint="פריטים שדורשים תשומת לב"
        />
        <StatCard
          label="נמכר היום"
          value={soldTodayCount}
          icon={CalendarDays}
          tone="success"
          hint={`${soldToday.length} עסקאות`}
        />
        <StatCard
          label="נמכר החודש"
          value={soldThisMonthCount}
          icon={ReceiptText}
          hint={`${soldThisMonth.length} עסקאות`}
        />
        <StatCard
          label="שווי מלאי משוער"
          value={formatCurrency(totalValue)}
          icon={Wallet}
          tone="accent"
          hint="לפי מחיר מכירה ליחידה"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>מכירות אחרונות</CardTitle>
            <LinkButton href="/sales" variant="ghost" size="sm">
              לכל ההיסטוריה
            </LinkButton>
          </CardHeader>
          <CardContent className="pt-0">
            {sales.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                עדיין לא נרשמו מכירות במערכת.
              </p>
            ) : (
              <div className="divide-y divide-chrome-200">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-chrome-900">
                        {sale.marble_type?.name_he ?? "פריט שנמחק"}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(sale.sold_at)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-end">
                      <p className="text-sm font-semibold text-chrome-900">
                        {sale.quantity} לוחות
                      </p>
                      {sale.sale_price != null && (
                        <p className="text-xs text-accent-dark">
                          {formatCurrency(sale.sale_price)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>התראות מלאי</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
                <CircleSlash size={22} className="text-chrome-400" />
                כל הפריטים במלאי תקין
              </div>
            ) : (
              [...outOfStockItems, ...lowStockItems].slice(0, 6).map((item) => {
                const status = getStockStatus(item);
                return (
                  <a
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-chrome-200 px-3.5 py-2.5 transition hover:border-accent/40 hover:bg-accent-soft/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-chrome-900">
                        {item.name_he}
                      </p>
                      <p className="text-xs text-muted">{item.quantity} יח&apos; במלאי</p>
                    </div>
                    <StatusBadge status={status} label={STATUS_LABELS[status]} />
                  </a>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
