import { SalesClient } from "@/components/sales/SalesClient";
import { getSales } from "@/lib/data";

export default async function SalesPage() {
  const sales = await getSales();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-chrome-900">היסטוריית מכירות</h2>
        <p className="text-sm text-muted">
          תיעוד מלא של כל עסקאות מכירת הלוחות באולם התצוגה
        </p>
      </div>

      <SalesClient sales={sales} />
    </div>
  );
}
