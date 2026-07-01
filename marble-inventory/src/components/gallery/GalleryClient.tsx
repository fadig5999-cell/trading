"use client";

import { MarbleCard } from "@/components/inventory/MarbleCard";
import { Input } from "@/components/ui/Input";
import type { MarbleType } from "@/lib/types";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export function GalleryClient({
  items,
  role,
}: {
  items: MarbleType[];
  role: "admin" | "viewer";
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      `${i.name} ${i.name_he} ${i.color}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search
          size={17}
          className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-chrome-400"
        />
        <Input
          placeholder="חיפוש בגלריה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pe-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <MarbleCard key={item.id} item={item} role={role} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">
          לא נמצאו פריטים בגלריה
        </p>
      )}
    </div>
  );
}
