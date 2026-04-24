"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// いいねのトグル、未ログインは { ok: false, reason: 'auth' } を返し、
// 呼び出し側でログイン誘導する。
export async function toggleLike(input: {
  targetType: "thread" | "reply";
  targetId: string;
}): Promise<
  { ok: true; liked: boolean } | { ok: false; reason: "auth" | "error" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "auth" };
  }

  const { data: existing } = await supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", input.targetType)
      .eq("target_id", input.targetId);
    if (error) {
      console.error("[toggleLike] delete failed:", error.message);
      return { ok: false, reason: "error" };
    }
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from("likes").insert({
    user_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
  });
  if (error) {
    console.error("[toggleLike] insert failed:", error.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true, liked: true };
}
