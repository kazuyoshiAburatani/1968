"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UpdateResult = { ok: true } | { ok: false; error: string };

// 返信本文の編集。本人のみ更新可（RLS でも担保）。
export async function updateReplyBody(input: {
  replyId: string;
  body: string;
  pathToRevalidate: string;
}): Promise<UpdateResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "本文を入力してください" };
  if (body.length > 3000)
    return { ok: false, error: "返信は3000文字以内でお願いします" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("replies")
    .update({ body })
    .eq("id", input.replyId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[updateReplyBody] failed:", error.message);
    return { ok: false, error: "更新に失敗しました" };
  }

  revalidatePath(input.pathToRevalidate);
  return { ok: true };
}
