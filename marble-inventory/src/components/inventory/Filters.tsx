'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Filter, X } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';

interface FiltersProps {
  filterOptions: {
    colors: string[];
    thicknesses: string[];
    locations: string[];
    categories: string[];
  };
}

export function InventoryFilters({ filterOptions }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  const currentSearch = searchParams.get('search') || '';
  const currentColor = searchParams.get('color') || '';
  const currentThickness = searchParams.get('thickness') || '';
  const currentLocation = searchParams.get('location') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentLowStock = searchParams.get('lowStock') === 'true';
  const currentSoldOut = searchParams.get('soldOut') === 'true';

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    startTransition(() => {
      router.push(`/inventory?${params.toString()}`);
    });
  }, [router, searchParams]);

  const clearFilters = () => {
    startTransition(() => {
      router.push('/inventory');
    });
  };

  const hasActiveFilters = currentSearch || currentColor || currentThickness ||
    currentLocation || currentCategory || currentLowStock || currentSoldOut;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם שיש..."
            defaultValue={currentSearch}
            onChange={e => {
              const value = e.target.value;
              const timeout = setTimeout(() => updateFilters({ search: value || null }), 300);
              return () => clearTimeout(timeout);
            }}
            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400/30"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          סינון
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="w-4 h-4" />
            נקה
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
          <Select
            label="צבע"
            value={currentColor}
            onChange={e => updateFilters({ color: e.target.value || null })}
            options={filterOptions.colors.map(c => ({ value: c, label: c }))}
          />
          <Select
            label="עובי"
            value={currentThickness}
            onChange={e => updateFilters({ thickness: e.target.value || null })}
            options={filterOptions.thicknesses.map(t => ({ value: t, label: t }))}
          />
          <Select
            label="מיקום"
            value={currentLocation}
            onChange={e => updateFilters({ location: e.target.value || null })}
            options={filterOptions.locations.map(l => ({ value: l, label: l }))}
          />
          <Select
            label="קטגוריה"
            value={currentCategory}
            onChange={e => updateFilters({ category: e.target.value || null })}
            options={filterOptions.categories.map(c => ({ value: c, label: c }))}
          />
          <div className="flex items-end gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentLowStock}
                onChange={e => updateFilters({ lowStock: e.target.checked ? 'true' : null })}
                className="rounded border-zinc-300"
              />
              <span className="text-sm text-zinc-700">מלאי נמוך</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentSoldOut}
                onChange={e => updateFilters({ soldOut: e.target.checked ? 'true' : null })}
                className="rounded border-zinc-300"
              />
              <span className="text-sm text-zinc-700">אזל מהמלאי</span>
            </label>
          </div>
        </div>
      )}
      {isPending && (
        <p className="text-xs text-zinc-400">טוען...</p>
      )}
    </div>
  );
}
