"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrCreateVoterKey } from "@/lib/voter-key";
import { hasFile, removeImage, storeImage } from "@/lib/image-upload";

// 二択投票の Server Action。
//
// 検証で初回参加スコア 8.8/10、6 ペルソナ全員が参加した唯一の施策。
// 成立条件は「登録不要・1 タップ・押した瞬間に世代内の得票率が出る」の 3 つで、
// どれかひとつでも欠けると効果が落ちる。
//
// 速度について（2026-08-05 に作り直した理由）。
// 当初は <form action={...}> ＋ redirect() で組んでいたが、
// 1 票入れるたびに
//   サーバ往復 → revalidatePath → ホーム全体の再描画（Supabase 問い合わせ十数回）
//   → 全画面ナビゲーション
// が走り、タップから画面が変わるまで数秒かかっていた。
// 押した瞬間に結果が出ることが施策の本体なので、これでは意味がない。
//
// いまは表示をクライアント側で即座に更新し、この Action は裏で保存するだけにしている。
// したがって、
//   ・redirect しない（全画面ナビゲーションを起こさない）
//   ・revalidatePath しない（ページは元々毎回動的に描画されるので不要。
//     ここで再検証をかけると、ユーザーが待つ必要のない再描画を誘発する）
// 呼び出し側は結果を待たずに描画を進め、失敗したときだけ元に戻す。

export type VoteResult = { ok: true } | { ok: false; message: string };

const VoteSchema = z.object({
  pollId: z.string().uuid(),
  // "other" は「どちらも選べない」人の受け皿
  choice: z.enum(["a", "b", "other"]),
});

export async function votePoll(
  pollId: string,
  choice: "a" | "b" | "other",
): Promise<VoteResult> {
  const parsed = VoteSchema.safeParse({ pollId, choice });
  if (!parsed.success) {
    return { ok: false, message: "投票できませんでした" };
  }

  // 未登録でも投票できるよう、サーバ側で識別子を発行する
  const voterKey = await getOrCreateVoterKey();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 書き込みは service_role 経由。anon に直接 insert を許すと票の水増しが容易になる。
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("poll_votes").upsert(
    {
      poll_id: parsed.data.pollId,
      voter_key: voterKey,
      user_id: user?.id ?? null,
      choice: parsed.data.choice,
    },
    { onConflict: "poll_id,voter_key" },
  );

  if (error) {
    console.error("[polls/vote]", error.message);
    return { ok: false, message: "投票できませんでした" };
  }

  return { ok: true };
}

// 投票に添える一言。投票の 1 タップから会話へ橋渡しする部分で、
// 検証では女性ペルソナがここで初めて文章を書いた（「中2まで聖子ちゃんカットでした」）。
//
// 写真について。
// 添えられるのは席をつくった人だけにしてある。文章の一言はこれまでどおり
// ゲストのまま書けるので、1 タップ参加の動線は変わらない。
// 写真だけ席を求めるのは、荒らされたときに誰が入れたのか辿れないと、
// 運営がひとりの場では対処しきれないため。
// 写真は 1 枚。位置情報はサーバ側で必ず落とす（lib/image-upload.ts）。
const CommentSchema = z.object({
  pollId: z.string().uuid(),
  comment: z.string().trim().max(200, "200文字以内でお願いします"),
});

export type CommentResult =
  | { ok: true; imagePath: string | null }
  | { ok: false; message: string };

export async function commentOnPoll(
  formData: FormData,
): Promise<CommentResult> {
  const parsed = CommentSchema.safeParse({
    pollId: formData.get("poll_id"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "書き込めませんでした",
    };
  }

  const photo = formData.get("photo");
  const wantsPhoto = hasFile(photo);

  if (parsed.data.comment.length === 0 && !wantsPhoto) {
    return { ok: false, message: "一言か写真か、どちらかをお願いします" };
  }

  const voterKey = await getOrCreateVoterKey();
  const admin = getSupabaseAdminClient();

  // 投票していない人がコメントだけ書くことはできない（先に選んでもらう）
  const { data: existing } = await admin
    .from("poll_votes")
    .select("choice, image_path")
    .eq("poll_id", parsed.data.pollId)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (!existing) {
    return { ok: false, message: "先にどちらかを選んでください" };
  }

  let imagePath: string | null =
    (existing as { image_path: string | null }).image_path ?? null;

  if (wantsPhoto) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 席があるかは profiles に行があるかで見る。
    // 登録が匿名サインインなので、auth.uid() の有無だけでは通りすがりと区別できない。
    const seat = user
      ? await admin
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle()
      : null;

    if (!seat?.data || !user) {
      return {
        ok: false,
        message: "写真を載せるには席が要ります。30秒でつくれます。",
      };
    }

    const stored = await storeImage(photo, "post-media", user.id);
    if (!stored.ok) return { ok: false, message: stored.message };

    // 差し替えるときは、前の写真を残さない
    await removeImage("post-media", imagePath);
    imagePath = stored.image.path;
  }

  const { error } = await admin
    .from("poll_votes")
    .update({ comment: parsed.data.comment || null, image_path: imagePath })
    .eq("poll_id", parsed.data.pollId)
    .eq("voter_key", voterKey);

  if (error) {
    console.error("[polls/comment]", error.message);
    return { ok: false, message: "書き込めませんでした" };
  }

  return { ok: true, imagePath };
}

/**
 * 自分が添えた一言と写真を取り消す。
 *
 * commentOnPoll は「一言か写真か、どちらかは要る」という決まりなので、
 * 空文字を送っても消せない。消したいという意思は、別の入口で受ける。
 * 票そのものは残す。消したいのは書いたものであって、選んだ事実ではない。
 */
export async function clearOwnPollComment(
  pollId: string,
): Promise<CommentResult> {
  if (typeof pollId !== "string" || pollId.length === 0) {
    return { ok: false, message: "消せませんでした" };
  }

  const voterKey = await getOrCreateVoterKey();
  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin
    .from("poll_votes")
    .select("image_path")
    .eq("poll_id", pollId)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (!existing) return { ok: false, message: "消せませんでした" };

  const { error } = await admin
    .from("poll_votes")
    .update({ comment: null, image_path: null })
    .eq("poll_id", pollId)
    .eq("voter_key", voterKey);

  if (error) {
    console.error("[polls/clear-comment]", error.message);
    return { ok: false, message: "消せませんでした" };
  }

  // 行から外すだけだと、URL を知っている人には写真が見え続ける
  await removeImage(
    "post-media",
    (existing as { image_path: string | null }).image_path,
  );

  return { ok: true, imagePath: null };
}
