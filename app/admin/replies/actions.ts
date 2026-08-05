"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// 運営としての返信。
// is_operator を立てて投稿すると、表示側に「運営」バッジが付き、
// 「必ず返事が来る場だ」ということが読む人に伝わる。

const ReplySchema = z.object({
  parent_response_id: z.string().uuid(),
  topic_id: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "返信を入力してください")
    .max(1000, "1000文字以内でお願いします"),
  feature: z
    .union([z.literal("on"), z.literal(""), z.undefined()])
    .optional()
    .transform((v) => v === "on"),
});

export async function replyAsOperator(formData: FormData) {
  const parsed = ReplySchema.safeParse({
    parent_response_id: formData.get("parent_response_id"),
    topic_id: formData.get("topic_id"),
    body: formData.get("body") ?? "",
    feature: formData.get("feature") ?? undefined,
  });

  if (!parsed.success) {
    redirect(
      `/admin/replies?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "返信できませんでした",
      )}`,
    );
  }

  const { user } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { error } = await sb.from("topic_responses").insert({
    topic_id: parsed.data.topic_id,
    user_id: user.id,
    body: parsed.data.body,
    media: [],
    parent_response_id: parsed.data.parent_response_id,
    is_operator: true,
  });

  if (error) {
    console.error("[admin/replies]", error.message);
    redirect(
      `/admin/replies?error=${encodeURIComponent("返信に失敗しました")}`,
    );
  }

  // 「今週のお便り」にも選ぶ場合は、元の投稿に採用の印を付ける
  if (parsed.data.feature) {
    await sb
      .from("topic_responses")
      .update({ featured_at: new Date().toISOString() })
      .eq("id", parsed.data.parent_response_id);
    revalidatePath("/letters");
  }

  revalidatePath("/admin/replies");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/topics/${parsed.data.topic_id}`);
  revalidatePath("/");
  redirect("/admin/replies?saved=1");
}
