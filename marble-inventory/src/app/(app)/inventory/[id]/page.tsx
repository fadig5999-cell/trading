import { DeleteButton } from "@/components/inventory/DeleteButton";
import { StockControls } from "@/components/inventory/StockControls";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { MOVEMENT_LABELS, STATUS_LABELS } from "@/lib/constants";
import { getCurrentProfile, getMarbleType, getStockMovements } from "@/lib/data";
import { formatCurrency, formatDateTime, getStockStatus } from "@/lib/utils";
import {
  ArrowRight,
  Gem,
  MapPin,
  Package,
  Palette,
  Ruler,
  Tag,
} from "lucide-react";
import { notFound } from "next/navigation";

export default async function MarbleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, movements, { profile }] = await Promise.all([
    getMarbleType(id),
    getStockMovements(id),
    getCurrentProfile(),
  ]);

  if (!item) notFound();
  const role = profile?.role ?? "viewer";
  const status = getStockStatus(item);

  return (
    <div className="space-y-5">
      <LinkButton href="/inventory" variant="ghost" size="sm" className="w-fit">
        <ArrowRight size={16} />
        חזרה למלאי
      </LinkButton>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-chrome-100 to-chrome-300">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name_he}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-chrome-400">
                  <Gem size={48} />
                </div>
              )}
              <div className="absolute top-4 start-4">
                <StatusBadge status={status} label={STATUS_LABELS[status]} />
              </div>
            </div>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-chrome-900">
                    {item.name_he}
                  </h2>
                  <p className="text-sm text-muted">{item.name}</p>
                </div>
                {role === "admin" && (
                  <div className="flex gap-2">
                    <LinkButton href={`/inventory/${item.id}/edit`} variant="outline" size="sm">
                      ערוך
                    </LinkButton>
                    <DeleteButton
                      marbleTypeId={item.id}
                      nameHe={item.name_he}
                      redirectTo="/inventory"
                      size="sm"
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <InfoStat icon={Tag} label="קטגוריה" value={item.category} />
                <InfoStat icon={Palette} label="צבע" value={item.color || "—"} />
                <InfoStat icon={Ruler} label="עובי" value={item.thickness || "—"} />
                <InfoStat icon={Package} label="גודל" value={item.size || "—"} />
                <InfoStat icon={MapPin} label="מיקום" value={item.location || "—"} />
                <InfoStat
                  icon={Tag}
                  label="מחיר עלות"
                  value={formatCurrency(item.cost_price)}
                />
                <InfoStat
                  icon={Tag}
                  label="מחיר מכירה"
                  value={formatCurrency(item.selling_price)}
                />
                <InfoStat
                  icon={Package}
                  label="כמות במלאי"
                  value={`${item.quantity} יח'`}
                />
              </div>

              {item.notes && (
                <div className="mt-5 rounded-xl bg-chrome-100/60 p-4 text-sm text-chrome-700">
                  <p className="mb-1 text-xs font-semibold text-chrome-500">הערות</p>
                  {item.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>היסטוריית תנועות מלאי</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {movements.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  אין תנועות מלאי עדיין
                </p>
              ) : (
                <div className="divide-y divide-chrome-200">
                  {movements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-chrome-800">
                          {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDateTime(m.created_at)}
                          {m.reason ? ` · ${m.reason}` : ""}
                        </p>
                      </div>
                      <Badge
                        className={
                          m.change >= 0
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-rose-50 text-rose-700 ring-rose-600/20"
                        }
                      >
                        {m.change >= 0 ? "+" : ""}
                        {m.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>עדכון מלאי</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {role === "admin" ? (
                <StockControls
                  marbleTypeId={item.id}
                  quantity={item.quantity}
                  sellingPrice={item.selling_price}
                />
              ) : (
                <p className="text-sm text-muted">
                  אין לך הרשאה לעדכן מלאי. פנה למנהל המערכת.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-chrome-200 p-3">
      <Icon size={16} className="mt-0.5 text-accent-dark" />
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p className="text-sm font-semibold text-chrome-900">{value}</p>
      </div>
    </div>
  );
}
