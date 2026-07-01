"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function uploadImageIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<string | null> {
  const file = formData.get("image");
  if (!file || !(file instanceof File) || file.size === 0) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("marble-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("image upload error", error.message);
    return null;
  }

  const { data } = supabase.storage.from("marble-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createMarbleType(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const name = str(formData, "name");
  const nameHe = str(formData, "name_he");
  if (!name || !nameHe) {
    return { error: "יש להזין שם באנגלית ושם בעברית" };
  }

  const imageUrl = await uploadImageIfPresent(supabase, formData);

  const payload = {
    name,
    name_he: nameHe,
    category: str(formData, "category") || "שיש",
    color: str(formData, "color"),
    thickness: str(formData, "thickness"),
    size: str(formData, "size"),
    quantity: num(formData, "quantity") ?? 0,
    low_stock_threshold: num(formData, "low_stock_threshold") ?? 3,
    location: str(formData, "location"),
    cost_price: num(formData, "cost_price"),
    selling_price: num(formData, "selling_price"),
    notes: str(formData, "notes") || null,
    image_url: imageUrl,
  };

  const { data, error } = await supabase
    .from("marble_types")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("createMarbleType error", error.message);
    return { error: "שגיאה בהוספת הפריט. ודא שיש לך הרשאת מנהל." };
  }

  if (data?.id) {
    await supabase.from("stock_movements").insert({
      marble_type_id: data.id,
      change: payload.quantity,
      movement_type: "create",
      reason: "יצירת פריט חדש במלאי",
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}

export async function updateMarbleType(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const name = str(formData, "name");
  const nameHe = str(formData, "name_he");
  if (!name || !nameHe) {
    return { error: "יש להזין שם באנגלית ושם בעברית" };
  }

  const imageUrl = await uploadImageIfPresent(supabase, formData);

  const payload: Record<string, unknown> = {
    name,
    name_he: nameHe,
    category: str(formData, "category") || "שיש",
    color: str(formData, "color"),
    thickness: str(formData, "thickness"),
    size: str(formData, "size"),
    low_stock_threshold: num(formData, "low_stock_threshold") ?? 3,
    location: str(formData, "location"),
    cost_price: num(formData, "cost_price"),
    selling_price: num(formData, "selling_price"),
    notes: str(formData, "notes") || null,
  };

  if (imageUrl) payload.image_url = imageUrl;

  const { error } = await supabase.from("marble_types").update(payload).eq("id", id);

  if (error) {
    console.error("updateMarbleType error", error.message);
    return { error: "שגיאה בעדכון הפריט. ודא שיש לך הרשאת מנהל." };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/dashboard");
  redirect(`/inventory/${id}`);
}

export async function deleteMarbleType(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("marble_types").delete().eq("id", id);

  if (error) {
    console.error("deleteMarbleType error", error.message);
    return { error: "שגיאה במחיקת הפריט. ודא שיש לך הרשאת מנהל." };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function sellSlab(
  marbleTypeId: string,
  options?: {
    quantity?: number;
    salePrice?: number | null;
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("sell_slabs", {
    p_marble_type_id: marbleTypeId,
    p_quantity: options?.quantity ?? 1,
    p_sale_price: options?.salePrice ?? null,
    p_customer_name: options?.customerName ?? null,
    p_customer_phone: options?.customerPhone ?? null,
    p_notes: options?.notes ?? null,
  });

  if (error) {
    console.error("sellSlab error", error.message);
    if (error.message.includes("INSUFFICIENT_STOCK")) {
      return { error: "אין מספיק מלאי לביצוע המכירה" };
    }
    if (error.message.includes("ONLY_ADMIN_CAN_SELL")) {
      return { error: "רק מנהל מערכת יכול לבצע מכירה" };
    }
    return { error: "שגיאה בביצוע המכירה" };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  revalidatePath("/reports");
  revalidatePath("/gallery");
  revalidatePath(`/inventory/${marbleTypeId}`);
  return { success: true };
}

export async function adjustStock(
  marbleTypeId: string,
  delta: number,
  movementType: "add" | "remove" | "manual",
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("adjust_stock", {
    p_marble_type_id: marbleTypeId,
    p_delta: delta,
    p_movement_type: movementType,
    p_reason: reason ?? null,
  });

  if (error) {
    console.error("adjustStock error", error.message);
    return { error: "שגיאה בעדכון המלאי" };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath(`/inventory/${marbleTypeId}`);
  revalidatePath("/gallery");
  return { success: true };
}

export async function setStockQuantity(
  marbleTypeId: string,
  newQuantity: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("marble_types")
    .select("quantity")
    .eq("id", marbleTypeId)
    .maybeSingle();

  const delta = newQuantity - (current?.quantity ?? 0);
  return adjustStock(marbleTypeId, delta, "manual", "עדכון כמות ידני");
}
