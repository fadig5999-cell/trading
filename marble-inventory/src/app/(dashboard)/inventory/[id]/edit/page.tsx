import { getMarbleById, getUserProfile } from '@/lib/actions';
import { MarbleForm } from '@/components/inventory/MarbleForm';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMarblePage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getUserProfile();
  if (profile?.role !== 'admin') redirect('/inventory');

  const marble = await getMarbleById(id);
  if (!marble) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/inventory/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">עריכת {marble.hebrew_name}</h1>
          <p className="text-sm text-zinc-500 mt-1">עדכון פרטי סוג השיש</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <MarbleForm marble={marble} mode="edit" />
        </CardContent>
      </Card>
    </div>
  );
}
