import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MarbleType, Profile, Sale, StockMovement } from "@/lib/types";

export async function getCurrentProfile(): Promise<{
  userEmail: string | null;
  profile: Profile | null;
}> {
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
