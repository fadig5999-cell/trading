import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validate URL format - fall back to placeholder if invalid
let supabaseUrl = 'https://placeholder.supabase.co'
try {
  if (rawUrl) {
    new URL(rawUrl)
    supabaseUrl = rawUrl
  }
} catch {
  // invalid URL, use placeholder
}

const supabaseAnonKey = rawKey || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MarbleType = {
  id: string
  name: string
  name_hebrew: string
  category: string
  color: string
  thickness: string
  size: string
  quantity: number
  location: string
  image_url: string | null
  cost_price: number | null
  selling_price: number | null
  notes: string | null
  status: 'in_stock' | 'low_stock' | 'sold_out'
  created_at: string
  updated_at: string
}

export type Sale = {
  id: string
  marble_type_id: string | null
  marble_name: string
  marble_name_hebrew: string | null
  quantity_sold: number
  selling_price: number | null
  total_amount: number | null
  customer_name: string | null
  customer_phone: string | null
  notes: string | null
  sold_at: string
  created_at: string
}

export type StockMovement = {
  id: string
  marble_type_id: string | null
  marble_name: string
  movement_type: 'add' | 'remove' | 'sell' | 'manual_adjust'
  quantity_change: number
  quantity_before: number
  quantity_after: number
  notes: string | null
  created_at: string
}
