import { getMarbleTypes, getUserProfile } from '@/lib/actions';
import { MarbleCard } from '@/components/inventory/MarbleCard';

export default async function GalleryPage() {
  const [marbles, profile] = await Promise.all([
    getMarbleTypes(),
    getUserProfile(),
  ]);

  const isAdmin = profile?.role === 'admin';
  const inStock = marbles.filter(m => m.quantity > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">גלריה</h1>
        <p className="text-sm text-zinc-500 mt-1">
          גלריית שיש ואבן טבעית | {inStock.length} סוגים זמינים
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {marbles.map(marble => (
          <MarbleCard key={marble.id} marble={marble} isAdmin={isAdmin} />
        ))}
      </div>

      {marbles.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-lg">הגלריה ריקה</p>
          <p className="text-sm mt-1">הוסף סוגי שיש כדי להציג אותם בגלריה</p>
        </div>
      )}
    </div>
  );
}
