import { MarbleForm } from "@/components/inventory/MarbleForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createMarbleType } from "@/lib/actions/marble";
import { getCurrentProfile } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function NewMarbleTypePage() {
  const { profile } = await getCurrentProfile();
  if (profile?.role !== "admin") {
    redirect("/inventory");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-chrome-900">הוספת סוג שיש חדש</h2>
        <p className="text-sm text-muted">מלא את פרטי הפריט להוספתו לקטלוג המלאי</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הפריט</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MarbleForm action={createMarbleType} submitLabel="הוסף סוג שיש" />
        </CardContent>
      </Card>
    </div>
  );
}
