"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createReport(input: {
  targetType: "thread" | "reply";
  targetId: string;
  reason: string;
}): Promise<
  | { ok: true }
  | { ok: false; reason: "auth" | "invalid" | "error" }
> {
  const trimmed = input.reason.trim();
  if (!trimmed || trimmed.length > 500) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "auth" };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: trimmed,
  });

  if (error) {
    console.error("[createReport] insert failed:", error.message);
    return { ok: false, reason: "error" };
  }

  return { ok: true };
}
