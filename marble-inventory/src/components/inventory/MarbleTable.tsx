import { StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { StockControls } from "@/components/inventory/StockControls";
import { DeleteButton } from "@/components/inventory/DeleteButton";
import { STATUS_LABELS } from "@/lib/constants";
import type { MarbleType } from "@/lib/types";
import { formatCurrency, getStockStatus } from "@/lib/utils";
import { Gem } from "lucide-react";
import Link from "next/link";

export function MarbleTable({
  items,
  role,
}: {
  items: MarbleType[];
  role: "admin" | "viewer";
}) {
  return (
    <div className="luxury-card overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-chrome-200 bg-chrome-100/60 text-start text-xs font-semibold text-chrome-600">
              <th className="px-4 py-3 text-start">פריט</th>
              <th className="px-4 py-3 text-start">קטגוריה</th>
              <th className="px-4 py-3 text-start">צבע</th>
              <th className="px-4 py-3 text-start">עובי / גודל</th>
              <th className="px-4 py-3 text-start">מיקום</th>
              <th className="px-4 py-3 text-start">כמות</th>
              <th className="px-4 py-3 text-start">מחיר מכירה</th>
              <th className="px-4 py-3 text-start">סטטוס</th>
              <th className="px-4 py-3 text-start">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chrome-200">
            {items.map((item) => {
              const status = getStockStatus(item);
              return (
                <tr key={item.id} className="transition hover:bg-chrome-100/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="flex items-center gap-3 min-w-[180px]"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-chrome-100 ring-1 ring-chrome-200">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name_he}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Gem size={16} className="text-chrome-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-chrome-900">
                          {item.name_he}
                        </p>
                        <p className="truncate text-xs text-muted">{item.name}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-chrome-700">{item.category}</td>
                  <td className="px-4 py-3 text-chrome-700">{item.color || "—"}</td>
                  <td className="px-4 py-3 text-chrome-700">
                    {item.thickness || "—"}
                    {item.size ? ` · ${item.size}` : ""}
                  </td>
                  <td className="px-4 py-3 text-chrome-700">{item.location || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-chrome-900">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-chrome-700">
                    {formatCurrency(item.selling_price)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} label={STATUS_LABELS[status]} />
                  </td>
                  <td className="px-4 py-3">
                    {role === "admin" ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StockControls
                          marbleTypeId={item.id}
                          quantity={item.quantity}
                          sellingPrice={item.selling_price}
                          compact
                        />
                        <LinkButton href={`/inventory/${item.id}/edit`} variant="ghost" size="sm">
                          ערוך
                        </LinkButton>
                        <DeleteButton marbleTypeId={item.id} nameHe={item.name_he} size="sm" />
                      </div>
                    ) : (
                      <LinkButton href={`/inventory/${item.id}`} variant="outline" size="sm">
                        פרטים
                      </LinkButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          לא נמצאו פריטים התואמים את החיפוש
        </p>
      )}
    </div>
  );
}
