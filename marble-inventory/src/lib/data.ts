import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MarbleType, Profile, Sale, StockMovement } from "@/lib/types";
import {
  DEMO_MARBLE_TYPES,
  DEMO_PROFILE,
  DEMO_SALES,
  DEMO_STOCK_MOVEMENTS,
} from "@/lib/demo-data";

const DEMO_MODE = process.env.DEMO_MODE === "1";

export async function getCurrentProfile(): Promise<{
  userEmail: string | null;
  profile: Profile | null;
}> {
  if (DEMO_MODE) {
    return { userEmail: "owner@showroom.co.il", profile: DEMO_PROFILE };
  }
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { userEmail: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { userEmail: user.email ?? null, profile: (profile as Profile) ?? null };
}

export async function getMarbleTypes(): Promise<MarbleType[]> {
  if (DEMO_MODE) return DEMO_MARBLE_TYPES;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marble_types")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMarbleTypes error", error.message);
    return [];
  }
  return (data as MarbleType[]) ?? [];
}

export async function getMarbleType(id: string): Promise<MarbleType | null> {
  if (DEMO_MODE) return DEMO_MARBLE_TYPES.find((m) => m.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marble_types")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getMarbleType error", error.message);
    return null;
  }
  return (data as MarbleType) ?? null;
}

export async function getSales(limit?: number): Promise<Sale[]> {
  if (DEMO_MODE) return limit ? DEMO_SALES.slice(0, limit) : DEMO_SALES;
  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select("*, marble_type:marble_types(*)")
    .order("sold_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("getSales error", error.message);
    return [];
  }
  return (data as unknown as Sale[]) ?? [];
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (DEMO_MODE) return [DEMO_PROFILE];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAllProfiles error", error.message);
    return [];
  }
  return (data as Profile[]) ?? [];
}

export async function getStockMovements(marbleTypeId: string): Promise<StockMovement[]> {
  if (DEMO_MODE) return DEMO_STOCK_MOVEMENTS.filter((m) => m.marble_type_id === marbleTypeId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("marble_type_id", marbleTypeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStockMovements error", error.message);
    return [];
  }
  return (data as StockMovement[]) ?? [];
}
