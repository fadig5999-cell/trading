import { StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { StockControls } from "@/components/inventory/StockControls";
import { STATUS_LABELS } from "@/lib/constants";
import type { MarbleType } from "@/lib/types";
import { formatCurrency, getStockStatus } from "@/lib/utils";
import { Gem, MapPin } from "lucide-react";

export function MarbleCard({
  item,
  role,
}: {
  item: MarbleType;
  role: "admin" | "viewer";
}) {
  const status = getStockStatus(item);

  return (
    <div className="luxury-card group overflow-hidden">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-chrome-100 to-chrome-300">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name_he}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-chrome-400">
            <Gem size={36} />
          </div>
        )}
        <div className="absolute top-3 start-3">
          <StatusBadge status={status} label={STATUS_LABELS[status]} />
        </div>
      </div>

      <div className="p-4">
        <p className="truncate text-sm font-semibold text-chrome-900">
          {item.name_he}
        </p>
        <p className="truncate text-xs text-muted">{item.name}</p>

        <div className="mt-2 flex items-center justify-between text-xs text-chrome-600">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {item.location || "לא צוין"}
          </span>
          <span className="font-medium text-chrome-800">
            {item.quantity} יח&apos;
          </span>
        </div>

        {item.selling_price != null && (
          <p className="mt-1.5 text-sm font-bold text-accent-dark">
            {formatCurrency(item.selling_price)}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <LinkButton href={`/inventory/${item.id}`} variant="outline" size="sm" fullWidth>
            פרטים
          </LinkButton>
        </div>

        {role === "admin" && (
          <div className="mt-2">
            <StockControls
              marbleTypeId={item.id}
              quantity={item.quantity}
              sellingPrice={item.selling_price}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}
