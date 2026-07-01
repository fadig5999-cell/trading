import { getSetting } from './db.js';

export function lowStockThreshold() {
  const n = parseInt(getSetting('low_stock_threshold', '3'), 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/** Compute a marble's stock status key. */
export function stockStatus(quantity, threshold = lowStockThreshold()) {
  if (quantity <= 0) return 'sold_out';
  if (quantity < threshold) return 'low_stock';
  return 'in_stock';
}

/** Attach computed status to a marble row. */
export function decorateMarble(row, threshold = lowStockThreshold()) {
  if (!row) return row;
  return { ...row, status: stockStatus(row.quantity, threshold) };
}

/** Coerce a value to a finite number, returning fallback otherwise. */
export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
