import type { MarbleTypeRow as DbMarbleTypeRow } from './db/schema';

export type MarbleTypeRow = DbMarbleTypeRow;
export type UserRole = 'admin' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface MarbleType {
  id: string;
  name: string;
  hebrew_name: string;
  category: string | null;
  color: string | null;
  thickness: string | null;
  size: string | null;
  quantity: number;
  location: string | null;
  image_url: string | null;
  cost_price: number | null;
  selling_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  marble_type_id: string;
  quantity_sold: number;
  sale_date: string;
  sale_time: string;
  price: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  sold_by: string | null;
  created_at: string;
  marble_types?: MarbleType;
}

export interface StockTransaction {
  id: string;
  marble_type_id: string;
  transaction_type: 'add' | 'remove' | 'sell' | 'manual';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'sold_out';

export function getStockStatus(quantity: number): StockStatus {
  if (quantity === 0) return 'sold_out';
  if (quantity < 3) return 'low_stock';
  return 'in_stock';
}

export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'sold_out':
      return 'אזל מהמלאי';
    case 'low_stock':
      return 'מלאי נמוך';
    case 'in_stock':
      return 'במלאי';
  }
}

export interface DashboardStats {
  totalTypes: number;
  totalSlabs: number;
  lowStockCount: number;
  soldOutCount: number;
  soldToday: number;
  soldThisMonth: number;
  inventoryValue: number;
}

export interface MarbleFilters {
  search: string;
  color: string;
  thickness: string;
  location: string;
  category: string;
  lowStock: boolean;
  soldOut: boolean;
}
