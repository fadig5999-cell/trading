import { MarbleForm } from "@/components/inventory/MarbleForm";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { updateMarbleType } from "@/lib/actions/marble";
import { getCurrentProfile, getMarbleType } from "@/lib/data";
import { ArrowRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";

export default async function EditMarbleTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, { profile }] = await Promise.all([
    getMarbleType(id),
    getCurrentProfile(),
  ]);

  if (!item) notFound();
  if (profile?.role !== "admin") redirect(`/inventory/${id}`);

  const action = updateMarbleType.bind(null, id);

  return (
    <div className="space-y-5">
      <LinkButton href={`/inventory/${id}`} variant="ghost" size="sm" className="w-fit">
        <ArrowRight size={16} />
        חזרה לפריט
      </LinkButton>

      <div>
        <h2 className="text-xl font-bold text-chrome-900">ערוך פריט: {item.name_he}</h2>
        <p className="text-sm text-muted">
          עדכן את פרטי הפריט. לשינוי כמות המלאי השתמש בכפתורי המלאי בעמוד הפריט.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הפריט</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MarbleForm action={action} defaultValues={item} submitLabel="שמור שינויים" />
        </CardContent>
      </Card>
    </div>
  );
}
