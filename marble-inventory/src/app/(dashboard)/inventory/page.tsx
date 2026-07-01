import { getMarbleTypes, getFilterOptions, getUserProfile } from '@/lib/actions';
import { MarbleTable } from '@/components/inventory/MarbleTable';
import { MarbleCard } from '@/components/inventory/MarbleCard';
import { InventoryFilters } from '@/components/inventory/Filters';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import { Plus, LayoutGrid, List } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    color?: string;
    thickness?: string;
    location?: string;
    category?: string;
    lowStock?: string;
    soldOut?: string;
    view?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [marbles, filterOptions, profile] = await Promise.all([
    getMarbleTypes({
      search: params.search,
      color: params.color,
      thickness: params.thickness,
      location: params.location,
      category: params.category,
      lowStock: params.lowStock === 'true',
      soldOut: params.soldOut === 'true',
    }),
    getFilterOptions(),
    getUserProfile(),
  ]);

  const isAdmin = profile?.role === 'admin';
  const view = params.view || 'table';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">מלאי</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {marbles.length} סוגי שיש | {marbles.reduce((s, m) => s + m.quantity, 0)} לוחות
          </p>
        </div>
        {isAdmin && (
          <Link href="/inventory/new">
            <Button>
              <Plus className="w-4 h-4" />
              הוסף סוג שיש
            </Button>
          </Link>
        )}
      </div>

      <InventoryFilters filterOptions={filterOptions} />

      <div className="flex gap-2">
        <Link href="/inventory?view=table">
          <Button variant={view === 'table' ? 'primary' : 'ghost'} size="sm">
            <List className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/inventory?view=cards">
          <Button variant={view === 'cards' ? 'primary' : 'ghost'} size="sm">
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {marbles.map(marble => (
            <MarbleCard key={marble.id} marble={marble} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <MarbleTable marbles={marbles} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
