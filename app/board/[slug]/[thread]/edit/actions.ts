"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";

// スレッド編集、title と body のみ更新可。
// media の差し替えはフェーズ3の範囲外（大きすぎる変更になるため次フェーズで検討）。
const ThreadUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "件名を入力してください")
    .max(100, "件名は100文字以内でお願いします"),
  body: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内でお願いします"),
});

export async function updateThread(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const threadId = String(formData.get("thread_id") ?? "");
  if (!slug || !threadId) redirect("/board");

  const parsed = ThreadUpdateSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(
      `/board/${slug}/${threadId}/edit?error=${encodeURIComponent(first.message)}`,
    );
  }

  const { supabase, user } = await requireSession();

  const { error } = await supabase
    .from("threads")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[updateThread] failed:", error.message);
    redirect(
      `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("更新に失敗しました、時間をおいてお試しください")}`,
    );
  }

  revalidatePath(`/board/${slug}/${threadId}`);
  revalidatePath(`/board/${slug}`);
  redirect(`/board/${slug}/${threadId}`);
}
