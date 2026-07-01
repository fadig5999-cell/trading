import { getMarbleById, getUserProfile } from '@/lib/actions';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StockBadge } from '@/components/ui/Badge';
import { StockControls } from '@/components/inventory/StockControls';
import { Button } from '@/components/ui/Button';
import { getStockStatus } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Pencil, ArrowRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MarbleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [marble, profile] = await Promise.all([
    getMarbleById(id),
    getUserProfile(),
  ]);

  if (!marble) notFound();

  const isAdmin = profile?.role === 'admin';
  const status = getStockStatus(marble.quantity);

  const details = [
    { label: 'שם באנגלית', value: marble.name },
    { label: 'קטגוריה', value: marble.category },
    { label: 'צבע', value: marble.color },
    { label: 'עובי', value: marble.thickness },
    { label: 'גודל', value: marble.size },
    { label: 'מיקום', value: marble.location },
    { label: 'מחיר עלות', value: formatCurrency(marble.cost_price) },
    { label: 'מחיר מכירה', value: formatCurrency(marble.selling_price) },
    { label: 'תאריך הוספה', value: formatDate(marble.created_at) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory">
          <Button variant="ghost" size="sm">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900">{marble.hebrew_name}</h1>
          <p className="text-sm text-zinc-500">{marble.name}</p>
        </div>
        <StockBadge status={status} />
        {isAdmin && (
          <Link href={`/inventory/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="w-4 h-4" />
              ערוך
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 shadow-lg">
          {marble.image_url ? (
            <Image src={marble.image_url} alt={marble.hebrew_name} fill className="object-cover" priority />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-300 text-6xl">◆</div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <p className="text-sm text-zinc-500">כמות במלאי</p>
                <p className="text-5xl font-bold text-zinc-900 mt-1">{marble.quantity}</p>
              </div>
              {isAdmin && <StockControls marble={marble} isAdmin={isAdmin} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">פרטים</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {details.map(d => d.value && (
                  <div key={d.label} className="flex justify-between text-sm">
                    <dt className="text-zinc-500">{d.label}</dt>
                    <dd className="font-medium text-zinc-900">{d.value}</dd>
                  </div>
                ))}
              </dl>
              {marble.notes && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <p className="text-sm text-zinc-500 mb-1">הערות</p>
                  <p className="text-sm text-zinc-700">{marble.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
