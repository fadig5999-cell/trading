export type UserRole = "admin" | "viewer";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface MarbleType {
  id: string;
  name: string;
  name_he: string;
  category: string;
  color: string;
  thickness: string;
  size: string;
  quantity: number;
  low_stock_threshold: number;
  location: string;
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
  quantity: number;
  sale_price: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  sold_at: string;
  created_by: string | null;
  marble_type?: MarbleType | null;
}

export interface StockMovement {
  id: string;
  marble_type_id: string;
  change: number;
  movement_type: "add" | "remove" | "sell" | "manual" | "create";
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

// Minimal Database type placeholder to satisfy the Supabase generics.
// Replace with generated types (supabase gen types typescript) once the
// project schema is finalized for stronger type safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
