'use client';

import Image from 'next/image';
import Link from 'next/link';
import { StockBadge } from '@/components/ui/Badge';
import { StockControls } from '@/components/inventory/StockControls';
import { Button } from '@/components/ui/Button';
import type { MarbleType } from '@/lib/types';
import { getStockStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { deleteMarbleType } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface MarbleTableProps {
  marbles: MarbleType[];
  isAdmin: boolean;
}

export function MarbleTable({ marbles, isAdmin }: MarbleTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`האם למחוק את ${name}?`)) return;
    setDeleting(id);
    try {
      await deleteMarbleType(id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setDeleting(null);
    }
  };

  if (marbles.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p className="text-lg">לא נמצאו סוגי שיש</p>
        <p className="text-sm mt-1">נסה לשנות את הסינון או הוסף סוג שיש חדש</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100">
            <th className="text-right py-3 px-4 font-medium text-zinc-500">תמונה</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500">שם</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500 hidden md:table-cell">קטגוריה</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500 hidden lg:table-cell">צבע</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500">כמות</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500">סטטוס</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500 hidden md:table-cell">מחיר</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {marbles.map(marble => (
            <tr key={marble.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
              <td className="py-3 px-4">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-100">
                  {marble.image_url ? (
                    <Image src={marble.image_url} alt="" fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-300">◆</div>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <Link href={`/inventory/${marble.id}`} className="font-medium text-zinc-900 hover:underline">
                  {marble.hebrew_name}
                </Link>
                <p className="text-xs text-zinc-400">{marble.name}</p>
              </td>
              <td className="py-3 px-4 text-zinc-600 hidden md:table-cell">{marble.category || '—'}</td>
              <td className="py-3 px-4 text-zinc-600 hidden lg:table-cell">{marble.color || '—'}</td>
              <td className="py-3 px-4 font-bold text-zinc-900">{marble.quantity}</td>
              <td className="py-3 px-4">
                <StockBadge status={getStockStatus(marble.quantity)} />
              </td>
              <td className="py-3 px-4 text-zinc-600 hidden md:table-cell">
                {formatCurrency(marble.selling_price)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <>
                      <Link href={`/inventory/${marble.id}/edit`}>
                        <Button size="sm" variant="ghost">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={deleting === marble.id}
                        onClick={() => handleDelete(marble.id, marble.hebrew_name)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarbleTableWithControls({ marbles, isAdmin }: MarbleTableProps) {
  return (
    <>
      <MarbleTable marbles={marbles} isAdmin={isAdmin} />
      {isAdmin && marbles.length > 0 && (
        <div className="mt-6 space-y-4 lg:hidden">
          {marbles.map(marble => (
            <div key={marble.id} className="p-4 bg-zinc-50 rounded-xl">
              <p className="font-medium mb-2">{marble.hebrew_name}</p>
              <StockControls marble={marble} isAdmin={isAdmin} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
