"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidReactionType, type ReactionType } from "@/lib/reactions";
import { saveDraft } from "@/lib/draft";
import { hasFile, removeImage, storeImage } from "@/lib/image-upload";
import { parseMedia, type MediaItem } from "@/lib/media";

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
  const photo = formData.get("photo");
  const wantsPhoto = hasFile(photo);

  if (body.length === 0 && !wantsPhoto) {
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
  //
  // 写真は預かれない。クッキーに入る大きさではないし、席をつくる前に
  // 誰のものとも分からないファイルをサーバに置くのは避けたい。
  // 画面側では席が無い人に写真ボタンを押させず先に席づくりへ案内しているので、
  // ここに来るのは画面を経由しなかった場合だけになる。
  if (!user) {
    await saveDraft({
      topicId: parsed.data.topic_id,
      body,
      returnPath: parsed.data.return_path,
      parentResponseId: parsed.data.parent_response_id,
    });
    redirect("/join?draft=1");
  }

  // 席があるかは profiles に行があるかで見る。
  // 登録が匿名サインインなので、auth.uid() の有無だけでは通りすがりと区別できない。
  const media: MediaItem[] = [];
  if (wantsPhoto) {
    const admin = getSupabaseAdminClient();
    const { data: seat } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!seat) {
      redirect(`/join?next=${encodeURIComponent(parsed.data.return_path)}`);
    }

    const stored = await storeImage(photo, "post-media", user.id);
    if (!stored.ok) {
      redirect(
        `${parsed.data.return_path}?error=${encodeURIComponent(stored.message)}`,
      );
    }
    media.push(stored.image);
  }

  const { error } = await supabase.from("topic_responses").insert({
    topic_id: parsed.data.topic_id,
    user_id: user.id,
    body,
    media,
    parent_response_id: parsed.data.parent_response_id ?? null,
  });

  if (error) {
    console.error("[topics/postResponse]", error.message);
    // 入れ損なった写真を置き去りにしない
    await removeImage("post-media", media[0]?.path);
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

  // 添えられていた写真も一緒に消す。行だけ消して Storage に残すと、
  // 「消した」と言われた写真が URL を知っている人には見え続けることになる。
  const { data: row } = await supabase
    .from("topic_responses")
    .select("media")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("topic_responses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (!error && row) {
    for (const m of parseMedia((row as { media: unknown }).media)) {
      await removeImage("post-media", m.path);
    }
  }

  revalidatePath(returnPath);
  redirect(returnPath);
}

/**
 * 自分が書いた回答を直す。
 *
 * これまでは削除しかなかった。スマホでの入力は誤字が出やすく、
 * 直せないと分かると次から書かなくなる。とくにこの年代では、
 * 「間違えたら消してもう一度」は面倒すぎて、そのまま黙る側に倒れる。
 *
 * 直せるのは本文だけ。写真の差し替えは、いまのところ
 * 「一度消してもう一度」でやってもらう。写真まで含めると、
 * 差し替え中に古い写真が Storage に残る道筋が増え、消し忘れが出る。
 *
 * 他人の回答を書き換えられないよう、更新は user_id 一致を必ず条件に入れる。
 * 運営が直したときの admin_edited_at とは別物なので、そちらは触らない。
 */
export async function updateOwnResponse(formData: FormData) {
  const id = formData.get("response_id");
  const returnPath =
    typeof formData.get("return_path") === "string"
      ? (formData.get("return_path") as string)
      : "/";

  if (typeof id !== "string") redirect(returnPath);

  const body = formData.get("body");
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length === 0) {
    redirect(
      `${returnPath}?error=${encodeURIComponent("何か一言、書いてみてください")}`,
    );
  }
  if (text.length > 1000) {
    redirect(
      `${returnPath}?error=${encodeURIComponent("1000文字以内でお願いします")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/join");

  const { error } = await supabase
    .from("topic_responses")
    .update({ body: text })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[topics/update]", error.message);
    redirect(
      `${returnPath}?error=${encodeURIComponent("直せませんでした")}`,
    );
  }

  revalidatePath(returnPath);
  redirect(returnPath);
}
