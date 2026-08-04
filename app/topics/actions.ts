"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidReactionType, type ReactionType } from "@/lib/reactions";

// お題まわりの Server Actions、
// 1. postTopicResponse、お題への短文回答を投稿
// 2. toggleReaction、リアクション付け外し（同じ種類なら削除、別種類なら差し替え、無ければ追加）

// -------------------------------------------------
// 1. お題への回答
// -------------------------------------------------
const PostResponseSchema = z.object({
  topic_id: z.string().uuid(),
  body: z.string().trim().max(1000, "1000 文字以内で入力してください"),
});

export async function postTopicResponse(formData: FormData) {
  const parsed = PostResponseSchema.safeParse({
    topic_id: formData.get("topic_id"),
    body: formData.get("body") ?? "",
  });

  if (!parsed.success) {
    redirect(
      `/?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力を確認してください",
      )}`,
    );
  }

  const body = parsed.data.body;
  if (body.length === 0) {
    redirect(`/?error=${encodeURIComponent("何か一言、書いてみてください")}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=required");
  }

  const { error } = await supabase.from("topic_responses").insert({
    topic_id: parsed.data.topic_id,
    user_id: user.id,
    body,
    media: [],
  });

  if (error) {
    console.error("[topics/postResponse]", error.message);
    redirect(`/?error=${encodeURIComponent("投稿に失敗しました")}`);
  }

  revalidatePath("/");
  redirect("/?posted=1");
}

// -------------------------------------------------
// 2. リアクション付け外し
// -------------------------------------------------
// 挙動、
// - 現在の自分の反応を確認
// - 無ければ追加
// - 同じ種類なら削除（トグル OFF）
// - 別種類なら上書き（差し替え、UPDATE 相当だが PK 変わらないので UPSERT 的に）
const ToggleReactionSchema = z.object({
  target_type: z.enum(["topic_response", "thread", "reply"]),
  target_id: z.string().uuid(),
  reaction_type: z
    .string()
    .refine(isValidReactionType, "リアクション種別が不正です"),
  return_path: z.string().default("/"),
});

export async function toggleReaction(formData: FormData) {
  const parsed = ToggleReactionSchema.safeParse({
    target_type: formData.get("target_type"),
    target_id: formData.get("target_id"),
    reaction_type: formData.get("reaction_type"),
    return_path: formData.get("return_path") ?? "/",
  });

  if (!parsed.success) {
    redirect(
      `/?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "リアクションに失敗しました",
      )}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=required");
  }

  // 現在の反応を確認、target_type + target_id + user_id の一意
  const { data: existing } = await supabase
    .from("likes")
    .select("reaction_type")
    .eq("target_type", parsed.data.target_type)
    .eq("target_id", parsed.data.target_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const currentType = (existing?.reaction_type as ReactionType | undefined) ??
    null;

  if (currentType === parsed.data.reaction_type) {
    // 同じボタンを再度、削除（トグル OFF）
    await supabase
      .from("likes")
      .delete()
      .eq("target_type", parsed.data.target_type)
      .eq("target_id", parsed.data.target_id)
      .eq("user_id", user.id);
  } else if (currentType) {
    // 別種類、上書き。RLS 経由の update は複雑なので admin client で確実に。
    const sbAdmin = getSupabaseAdminClient();
    await sbAdmin
      .from("likes")
      .update({ reaction_type: parsed.data.reaction_type })
      .eq("target_type", parsed.data.target_type)
      .eq("target_id", parsed.data.target_id)
      .eq("user_id", user.id);
  } else {
    // 新規、追加
    await supabase.from("likes").insert({
      user_id: user.id,
      target_type: parsed.data.target_type,
      target_id: parsed.data.target_id,
      reaction_type: parsed.data.reaction_type,
    });
  }

  revalidatePath(parsed.data.return_path);
  redirect(parsed.data.return_path);
}
