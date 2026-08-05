"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrCreateVoterKey } from "@/lib/voter-key";

// 二択投票の Server Action。
//
// 検証で初回参加スコア 8.8/10、6 ペルソナ全員が参加した唯一の施策。
// 成立条件は「登録不要・1 タップ・押した瞬間に世代内の得票率が出る」の 3 つで、
// どれかひとつでも欠けると効果が落ちる。
// とくに投票直後に登録を促すモーダルを出すと「釣りかよ」と信頼が崩れるため、
// 投票後はその場に留まり、結果と一言コメント欄だけを見せる。

const VoteSchema = z.object({
  poll_id: z.string().uuid(),
  choice: z.enum(["a", "b"]),
  return_path: z.string().default("/"),
});

export async function votePoll(formData: FormData) {
  const parsed = VoteSchema.safeParse({
    poll_id: formData.get("poll_id"),
    choice: formData.get("choice"),
    return_path: formData.get("return_path") ?? "/",
  });

  if (!parsed.success) {
    redirect("/?error=" + encodeURIComponent("投票できませんでした"));
  }

  const { poll_id, choice, return_path } = parsed.data;

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
      poll_id,
      voter_key: voterKey,
      user_id: user?.id ?? null,
      choice,
    },
    { onConflict: "poll_id,voter_key" },
  );

  if (error) {
    console.error("[polls/vote]", error.message);
    redirect(`${return_path}?error=${encodeURIComponent("投票できませんでした")}`);
  }

  revalidatePath(return_path);
  redirect(`${return_path}#poll-${poll_id}`);
}

// 投票に添える一言。投票の 1 タップから会話へ橋渡しする部分で、
// 検証では女性ペルソナがここで初めて文章を書いた（「中2まで聖子ちゃんカットでした」）。
const CommentSchema = z.object({
  poll_id: z.string().uuid(),
  comment: z.string().trim().max(200, "200文字以内でお願いします"),
  return_path: z.string().default("/"),
});

export async function commentOnPoll(formData: FormData) {
  const parsed = CommentSchema.safeParse({
    poll_id: formData.get("poll_id"),
    comment: formData.get("comment") ?? "",
    return_path: formData.get("return_path") ?? "/",
  });

  const returnPath =
    typeof formData.get("return_path") === "string"
      ? (formData.get("return_path") as string)
      : "/";

  if (!parsed.success) {
    redirect(
      `${returnPath}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "書き込めませんでした",
      )}`,
    );
  }

  const { poll_id, comment, return_path } = parsed.data;
  if (comment.length === 0) {
    redirect(`${return_path}#poll-${poll_id}`);
  }

  const voterKey = await getOrCreateVoterKey();
  const admin = getSupabaseAdminClient();

  // 投票していない人がコメントだけ書くことはできない（先に選んでもらう）
  const { data: existing } = await admin
    .from("poll_votes")
    .select("choice")
    .eq("poll_id", poll_id)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (!existing) {
    redirect(
      `${return_path}?error=${encodeURIComponent("先にどちらかを選んでください")}#poll-${poll_id}`,
    );
  }

  const { error } = await admin
    .from("poll_votes")
    .update({ comment })
    .eq("poll_id", poll_id)
    .eq("voter_key", voterKey);

  if (error) {
    console.error("[polls/comment]", error.message);
    redirect(
      `${return_path}?error=${encodeURIComponent("書き込めませんでした")}#poll-${poll_id}`,
    );
  }

  revalidatePath(return_path);
  redirect(`${return_path}#poll-${poll_id}`);
}
