import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PollChoice, PollRow, PollWithResult } from "@/lib/polls";

// 二択投票の読み出し。ホームとお題ページの両方から使う。
// service_role の鍵を使うので、ここはサーバからしか読み込めない。

/**
 * 公開中の投票を新しい順に取得し、集計と自分の投票状況を添えて返す。
 * 得票率は投票した本人にしか見せない（先に結果を見ると素直な回答が歪むため）。
 *
 * 票の読み出しについて。
 * 以前は poll_votes を直接引いていたが、この表には voter_key（投票者の識別子）が
 * 入っており、しかも誰でも読める設定だった。他人の識別子を拾ってクッキーに入れれば
 * その人の票と一言を上書きできる状態だったので、
 *   ・集計と一言 …… voter_key を落とした poll_votes_public ビューから読む
 *   ・自分の 1 票 … service_role で、自分の voter_key の行だけを引く
 * の 2 本に分けた。2 本は同時に投げるので、待ち時間は 1 本のときと変わらない。
 */
export async function loadPolls(
  supabase: SupabaseClient,
  opts: { limit?: number; voterKey: string | null; pollId?: string },
): Promise<PollWithResult[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from("polls")
    .select(
      "id, question, option_a, option_b, option_a_image, option_b_image, icon, header_image, blurb, era, gender_lean, published_at",
    )
    .eq("is_active", true)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false });

  if (opts.pollId) query = query.eq("id", opts.pollId);
  if (opts.limit) query = query.limit(opts.limit);

  const { data } = await query;
  const polls = (data ?? []) as PollRow[];
  if (polls.length === 0) return [];

  const ids = polls.map((p) => p.id);

  type VoteRow = {
    poll_id: string;
    choice: PollChoice;
    comment: string | null;
    image_path: string | null;
    created_at: string;
  };
  type MineRow = { poll_id: string; choice: PollChoice };

  const [{ data: voteData }, { data: mineData }] = await Promise.all([
    supabase
      .from("poll_votes_public")
      .select("poll_id, choice, comment, image_path, created_at")
      .in("poll_id", ids),
    opts.voterKey
      ? getSupabaseAdminClient()
          .from("poll_votes")
          .select("poll_id, choice")
          .eq("voter_key", opts.voterKey)
          .in("poll_id", ids)
      : Promise.resolve({ data: [] as MineRow[] }),
  ]);

  const votes = (voteData ?? []) as VoteRow[];
  const myVotes = new Map(
    ((mineData ?? []) as MineRow[]).map((v) => [v.poll_id, v.choice]),
  );

  return polls.map((p) => {
    const forPoll = votes.filter((v) => v.poll_id === p.id);
    const countA = forPoll.filter((v) => v.choice === "a").length;
    const countB = forPoll.filter((v) => v.choice === "b").length;
    const countOther = forPoll.filter((v) => v.choice === "other").length;
    const comments = forPoll
      .filter(
        (v) =>
          (v.comment && v.comment.trim().length > 0) || v.image_path !== null,
      )
      .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))
      .slice(0, 20)
      .map((v) => ({
        choice: v.choice,
        comment: v.comment ?? "",
        image_path: v.image_path,
        created_at: v.created_at,
      }));

    return {
      ...p,
      countA,
      countB,
      countOther,
      total: countA + countB + countOther,
      myChoice: myVotes.get(p.id) ?? null,
      comments,
    };
  });
}
