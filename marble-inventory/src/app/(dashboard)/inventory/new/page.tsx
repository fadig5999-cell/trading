import { getUserProfile } from '@/lib/actions';
import { MarbleForm } from '@/components/inventory/MarbleForm';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { redirect } from 'next/navigation';

export default async function NewMarblePage() {
  const profile = await getUserProfile();
  if (profile?.role !== 'admin') redirect('/inventory');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">הוסף סוג שיש</h1>
        <p className="text-sm text-zinc-500 mt-1">הוספת סוג שיש או אבן חדש למלאי</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <MarbleForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
