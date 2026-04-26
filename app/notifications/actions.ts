"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";

export async function markNotificationsSeen() {
  const { supabase, user } = await requireSession();
  await supabase
    .from("users")
    .update({ last_notifications_seen_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/notifications");
}
