"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidReactionType, type ReactionType } from "@/lib/reactions";
import { saveDraft } from "@/lib/draft";

// お題まわりの Server Actions。
//  1. postTopicResponse   お題への短文回答（未登録なら下書きを預かって席づくりへ）
//  2. toggleReaction      リアクションの付け外し
//  3. featureResponse     運営が「今週のお便り」に採用する
//  4. deleteOwnResponse   本人が自分の投稿を消す

// -------------------------------------------------
// 1. お題への回答
// -------------------------------------------------
const PostResponseSchema = z.object({
  topic_id: z.string().uuid(),
  body: z.string().trim().max(1000, "1000文字以内でお願いします"),
  parent_response_id: z.string().uuid().optional(),
  return_path: z.string().default("/"),
});

export async function postTopicResponse(formData: FormData) {
  const rawParent = formData.get("parent_response_id");
  const returnPath =
    typeof formData.get("return_path") === "string"
      ? (formData.get("return_path") as string)
      : "/";

  const parsed = PostResponseSchema.safeParse({
    topic_id: formData.get("topic_id"),
    body: formData.get("body") ?? "",
    parent_response_id:
      typeof rawParent === "string" && rawParent.length > 0
        ? rawParent
        : undefined,
    return_path: returnPath,
  });

  if (!parsed.success) {
    redirect(
      `${returnPath}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力を確認してください",
      )}`,
    );
  }

  const body = parsed.data.body;
  if (body.length === 0) {
    redirect(
      `${parsed.data.return_path}?error=${encodeURIComponent("何か一言、書いてみてください")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未登録でも書けるようにする。書いた文章はクッキーに預け、席づくりが済んだら自動で投稿する。
  // ここで文章を捨てて登録画面に飛ばすと、二度と書いてもらえない。
  if (!user) {
    await saveDraft({
      topicId: parsed.data.topic_id,
      body,
      returnPath: parsed.data.return_path,
      parentResponseId: parsed.data.parent_response_id,
    });
    redirect("/join?draft=1");
  }

  const { error } = await supabase.from("topic_responses").insert({
    topic_id: parsed.data.topic_id,
    user_id: user.id,
    body,
    media: [],
    parent_response_id: parsed.data.parent_response_id ?? null,
  });

  if (error) {
    console.error("[topics/postResponse]", error.message);
    redirect(
      `${parsed.data.return_path}?error=${encodeURIComponent("投稿に失敗しました")}`,
    );
  }

  revalidatePath(parsed.data.return_path);
  const anchor = parsed.data.parent_response_id
    ? `#response-${parsed.data.parent_response_id}`
    : "";
  redirect(`${parsed.data.return_path}?posted=1${anchor}`);
}

// -------------------------------------------------
// 2. リアクション
// -------------------------------------------------
// 速度について。
// 以前は <form action={...}> ＋ revalidatePath ＋ redirect で組んでいたため、
// スタンプを 1 つ押すたびにホーム全体が再描画され、数秒待たされていた。
// リアクションは「文章を書く気力が残っていない人の唯一の参加手段」なので、
// ここが重いと、その人たちの参加が丸ごと失われる。
//
// いまは表示をクライアント側で即座に切り替え、この Action は保存だけを担う。
// redirect も revalidatePath もしない（ページは毎回動的に描画されるので不要）。
export type ReactionResult =
  | { ok: true }
  | { ok: false; needsJoin?: boolean; message?: string };

const ToggleReactionSchema = z.object({
  targetId: z.string().uuid(),
  reactionType: z
    .string()
    .refine(isValidReactionType, "リアクション種別が不正です"),
});

export async function toggleReaction(
  targetId: string,
  reactionType: string,
): Promise<ReactionResult> {
  const parsed = ToggleReactionSchema.safeParse({ targetId, reactionType });
  if (!parsed.success) {
    return { ok: false, message: "リアクションできませんでした" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // リアクションだけは未登録でも押したい気持ちが強いが、
  // 誰が押したかを 1 人 1 回に保つには席が要る。席づくりは 30 秒で終わる。
  if (!user) {
    return { ok: false, needsJoin: true };
  }

  const { data: existing } = await supabase
    .from("likes")
    .select("reaction_type")
    .eq("target_type", "topic_response")
    .eq("target_id", parsed.data.targetId)
    .eq("user_id", user.id)
    .maybeSingle();

  const currentType =
    (existing?.reaction_type as ReactionType | undefined) ?? null;

  if (currentType === parsed.data.reactionType) {
    await supabase
      .from("likes")
      .delete()
      .eq("target_type", "topic_response")
      .eq("target_id", parsed.data.targetId)
      .eq("user_id", user.id);
  } else if (currentType) {
    const sbAdmin = getSupabaseAdminClient();
    await sbAdmin
      .from("likes")
      .update({ reaction_type: parsed.data.reactionType })
      .eq("target_type", "topic_response")
      .eq("target_id", parsed.data.targetId)
      .eq("user_id", user.id);
  } else {
    const { error } = await supabase.from("likes").insert({
      user_id: user.id,
      target_type: "topic_response",
      target_id: parsed.data.targetId,
      reaction_type: parsed.data.reactionType,
    });
    if (error) {
      console.error("[topics/toggleReaction]", error.message);
      return { ok: false, message: "リアクションできませんでした" };
    }
  }

  return { ok: true };
}

// -------------------------------------------------
// 3. 「今週のお便り」への採用（運営のみ）
// -------------------------------------------------
// ラジオのハガキ採用にあたる承認装置。
// 検証では、採用された瞬間に「（家族に）おい、俺の投稿が載っとるぞ」という反応が出て、
// ここで初めて課金してもいいという心理が生まれていた。
const FeatureSchema = z.object({
  response_id: z.string().uuid(),
  note: z.string().trim().max(300).optional(),
  unfeature: z.enum(["0", "1"]).default("0"),
  return_path: z.string().default("/admin/letters"),
});

export async function featureResponse(formData: FormData) {
  const parsed = FeatureSchema.safeParse({
    response_id: formData.get("response_id"),
    note: formData.get("note") ?? undefined,
    unfeature: formData.get("unfeature") ?? "0",
    return_path: formData.get("return_path") ?? "/admin/letters",
  });

  if (!parsed.success) redirect("/admin/letters?error=invalid");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) redirect("/");

  const sbAdmin = getSupabaseAdminClient();
  await sbAdmin
    .from("topic_responses")
    .update(
      parsed.data.unfeature === "1"
        ? { featured_at: null, featured_note: null }
        : {
            featured_at: new Date().toISOString(),
            featured_note: parsed.data.note ?? null,
          },
    )
    .eq("id", parsed.data.response_id);

  revalidatePath(parsed.data.return_path);
  revalidatePath("/letters");
  redirect(parsed.data.return_path);
}

// -------------------------------------------------
// 4. 自分の投稿を消す
// -------------------------------------------------
// 「あとから消せる」と明記されていることが、慎重な人が最初の一歩を出す条件だった。
export async function deleteOwnResponse(formData: FormData) {
  const id = formData.get("response_id");
  const returnPath =
    typeof formData.get("return_path") === "string"
      ? (formData.get("return_path") as string)
      : "/";

  if (typeof id !== "string") redirect(returnPath);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/join");

  await supabase
    .from("topic_responses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath(returnPath);
  redirect(returnPath);
}
