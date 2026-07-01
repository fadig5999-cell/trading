import { InventoryClient } from "@/components/inventory/InventoryClient";
import { LinkButton } from "@/components/ui/Button";
import { getCurrentProfile, getMarbleTypes } from "@/lib/data";
import { Plus } from "lucide-react";

export default async function InventoryPage() {
  const [items, { profile }] = await Promise.all([
    getMarbleTypes(),
    getCurrentProfile(),
  ]);
  const role = profile?.role ?? "viewer";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-chrome-900">מלאי שיש ואבן</h2>
          <p className="text-sm text-muted">
            כל סוגי השיש והאבן הטבעית באולם התצוגה ובמחסן
          </p>
        </div>
        {role === "admin" && (
          <LinkButton href="/inventory/new" variant="secondary">
            <Plus size={16} />
            הוסף סוג שיש
          </LinkButton>
        )}
      </div>

      <InventoryClient items={items} role={role} />
    </div>
  );
}
