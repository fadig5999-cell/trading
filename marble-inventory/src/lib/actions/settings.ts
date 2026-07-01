"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error("updateUserRole error", error.message);
    return { error: "שגיאה בעדכון ההרשאה. פעולה זו מותרת למנהלים בלבד." };
  }

  revalidatePath("/settings");
  return { success: true };
}
