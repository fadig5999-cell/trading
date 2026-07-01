'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { StockBadge } from '@/components/ui/Badge';
import { StockControls } from '@/components/inventory/StockControls';
import type { MarbleType } from '@/lib/types';
import { getStockStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface MarbleCardProps {
  marble: MarbleType;
  isAdmin: boolean;
  showControls?: boolean;
}

export function MarbleCard({ marble, isAdmin, showControls = true }: MarbleCardProps) {
  const status = getStockStatus(marble.quantity);

  return (
    <Card hover className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-zinc-100">
        {marble.image_url ? (
          <Image
            src={marble.image_url}
            alt={marble.hebrew_name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-300">
            <span className="text-4xl">◆</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StockBadge status={status} />
        </div>
      </div>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-zinc-900">{marble.hebrew_name}</h3>
          <p className="text-sm text-zinc-500">{marble.name}</p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">כמות במלאי</span>
          <span className="font-bold text-lg text-zinc-900">{marble.quantity}</span>
        </div>
        {marble.selling_price && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">מחיר</span>
            <span className="font-semibold text-zinc-900">{formatCurrency(marble.selling_price)}</span>
          </div>
        )}
        {marble.location && (
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <MapPin className="w-3 h-3" />
            {marble.location}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Link
            href={`/inventory/${marble.id}`}
            className="flex-1 text-center py-2 text-sm font-medium text-zinc-700 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            פרטים
          </Link>
        </div>
        {showControls && (
          <StockControls marble={marble} isAdmin={isAdmin} />
        )}
      </CardContent>
    </Card>
  );
}
