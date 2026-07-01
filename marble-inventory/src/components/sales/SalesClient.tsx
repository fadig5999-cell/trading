"use client";

import { Input } from "@/components/ui/Input";
import type { Sale } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Phone, Receipt, Search, User } from "lucide-react";
import { useMemo, useState } from "react";

export function SalesClient({ sales }: { sales: Sale[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return sales;
    const q = search.toLowerCase();
    return sales.filter((s) =>
      [
        s.marble_type?.name_he,
        s.marble_type?.name,
        s.customer_name,
        s.customer_phone,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [sales, search]);

  const totalRevenue = filtered.reduce(
    (sum, s) => sum + (s.sale_price ?? 0) * s.quantity,
    0
  );
  const totalQuantity = filtered.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="luxury-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-chrome-400"
          />
          <Input
            placeholder="חיפוש לפי שיש, לקוח או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pe-10"
          />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-muted">
            <span className="font-semibold text-chrome-900">{filtered.length}</span> עסקאות
          </span>
          <span className="text-muted">
            <span className="font-semibold text-chrome-900">{totalQuantity}</span> לוחות
          </span>
          <span className="text-muted">
            סה&quot;כ:{" "}
            <span className="font-semibold text-accent-dark">
              {formatCurrency(totalRevenue)}
            </span>
          </span>
        </div>
      </div>

      <div className="luxury-card overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-chrome-200 bg-chrome-100/60 text-start text-xs font-semibold text-chrome-600">
                <th className="px-4 py-3 text-start">סוג שיש</th>
                <th className="px-4 py-3 text-start">כמות</th>
                <th className="px-4 py-3 text-start">מחיר</th>
                <th className="px-4 py-3 text-start">תאריך ושעה</th>
                <th className="px-4 py-3 text-start">לקוח</th>
                <th className="px-4 py-3 text-start">הערות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome-200">
              {filtered.map((sale) => (
                <tr key={sale.id} className="hover:bg-chrome-100/40">
                  <td className="px-4 py-3 font-medium text-chrome-900">
                    {sale.marble_type?.name_he ?? "פריט שנמחק"}
                  </td>
                  <td className="px-4 py-3 text-chrome-700">{sale.quantity}</td>
                  <td className="px-4 py-3 text-chrome-700">
                    {formatCurrency(sale.sale_price)}
                  </td>
                  <td className="px-4 py-3 text-chrome-700">
                    {formatDateTime(sale.sold_at)}
                  </td>
                  <td className="px-4 py-3 text-chrome-700">
                    {sale.customer_name || sale.customer_phone ? (
                      <div className="space-y-0.5">
                        {sale.customer_name && (
                          <p className="flex items-center gap-1.5">
                            <User size={13} className="text-chrome-400" />
                            {sale.customer_name}
                          </p>
                        )}
                        {sale.customer_phone && (
                          <p className="flex items-center gap-1.5 text-xs text-muted">
                            <Phone size={12} className="text-chrome-400" />
                            {sale.customer_phone}
                          </p>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {sale.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted">
            <Receipt size={24} className="text-chrome-400" />
            לא נמצאו עסקאות מכירה
          </div>
        )}
      </div>
    </div>
  );
}
