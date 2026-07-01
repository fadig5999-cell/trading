"use client";

import { MarbleCard } from "@/components/inventory/MarbleCard";
import { MarbleTable } from "@/components/inventory/MarbleTable";
import { Input, Select } from "@/components/ui/Input";
import { MARBLE_CATEGORIES } from "@/lib/constants";
import type { MarbleType } from "@/lib/types";
import { getStockStatus } from "@/lib/utils";
import { LayoutGrid, Search, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function InventoryClient({
  items,
  role,
}: {
  items: MarbleType[];
  role: "admin" | "viewer";
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [thickness, setThickness] = useState("");
  const [location, setLocation] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");

  useEffect(() => {
    if (window.innerWidth < 768) setView("grid");
  }, []);

  const colors = useMemo(
    () => Array.from(new Set(items.map((i) => i.color).filter(Boolean))),
    [items]
  );
  const thicknesses = useMemo(
    () => Array.from(new Set(items.map((i) => i.thickness).filter(Boolean))),
    [items]
  );
  const locations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location).filter(Boolean))),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (
        search &&
        !`${item.name} ${item.name_he}`.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (category && item.category !== category) return false;
      if (color && item.color !== color) return false;
      if (thickness && item.thickness !== thickness) return false;
      if (location && item.location !== location) return false;
      if (statusFilter && getStockStatus(item) !== statusFilter) return false;
      return true;
    });
  }, [items, search, category, color, thickness, location, statusFilter]);

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setColor("");
    setThickness("");
    setLocation("");
    setStatusFilter("");
  };

  const hasFilters = search || category || color || thickness || location || statusFilter;

  return (
    <div className="space-y-4">
      <div className="luxury-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-chrome-400"
            />
            <Input
              placeholder="חיפוש לפי שם שיש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pe-10"
            />
          </div>
          <div className="flex gap-1.5 rounded-xl bg-chrome-100 p-1">
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === "table" ? "bg-white shadow-sm text-chrome-900" : "text-chrome-500"
              }`}
            >
              <Table2 size={16} /> טבלה
            </button>
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === "grid" ? "bg-white shadow-sm text-chrome-900" : "text-chrome-500"
              }`}
            >
              <LayoutGrid size={16} /> כרטיסים
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">כל הקטגוריות</option>
            {MARBLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="">כל הצבעים</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={thickness} onChange={(e) => setThickness(e.target.value)}>
            <option value="">כל העוביים</option>
            {thicknesses.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">כל המיקומים</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">כל הסטטוסים</option>
            <option value="low_stock">מלאי נמוך</option>
            <option value="out_of_stock">אזל מהמלאי</option>
            <option value="in_stock">במלאי</option>
          </Select>
          {hasFilters ? (
            <button
              onClick={resetFilters}
              className="rounded-xl border border-chrome-300 px-3 py-2.5 text-sm font-medium text-chrome-600 hover:bg-chrome-100"
            >
              איפוס סינון
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      <p className="text-sm text-muted">
        מציג {filtered.length} מתוך {items.length} סוגי שיש
      </p>

      {view === "table" ? (
        <MarbleTable items={filtered} role={role} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <MarbleCard key={item.id} item={item} role={role} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted">
              לא נמצאו פריטים התואמים את החיפוש
            </p>
          )}
        </div>
      )}
    </div>
  );
}
