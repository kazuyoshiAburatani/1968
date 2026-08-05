import type { SupabaseClient } from "@supabase/supabase-js";

// 二択投票の読み出し。ホームとお題ページの両方から使う。

export type PollRow = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  blurb: string;
  era: string | null;
  gender_lean: "male" | "female" | "both";
  published_at: string;
};

export type PollWithResult = PollRow & {
  countA: number;
  countB: number;
  total: number;
  /** 自分がどちらに入れたか。未投票なら null */
  myChoice: "a" | "b" | null;
  /** 投票に添えられた一言、新しい順 */
  comments: { choice: "a" | "b"; comment: string; created_at: string }[];
};

/**
 * 公開中の投票を新しい順に取得し、集計と自分の投票状況を添えて返す。
 * 得票率は投票した本人にしか見せない（先に結果を見ると素直な回答が歪むため）。
 */
export async function loadPolls(
  supabase: SupabaseClient,
  opts: { limit?: number; voterKey: string | null; pollId?: string },
): Promise<PollWithResult[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from("polls")
    .select(
      "id, question, option_a, option_b, blurb, era, gender_lean, published_at",
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
  const { data: voteData } = await supabase
    .from("poll_votes")
    .select("poll_id, voter_key, choice, comment, created_at")
    .in("poll_id", ids);

  type VoteRow = {
    poll_id: string;
    voter_key: string;
    choice: "a" | "b";
    comment: string | null;
    created_at: string;
  };
  const votes = (voteData ?? []) as VoteRow[];

  return polls.map((p) => {
    const mine = votes.filter((v) => v.poll_id === p.id);
    const countA = mine.filter((v) => v.choice === "a").length;
    const countB = mine.filter((v) => v.choice === "b").length;
    const myVote = opts.voterKey
      ? mine.find((v) => v.voter_key === opts.voterKey)
      : undefined;
    const comments = mine
      .filter((v) => v.comment && v.comment.trim().length > 0)
      .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))
      .slice(0, 20)
      .map((v) => ({
        choice: v.choice,
        comment: v.comment as string,
        created_at: v.created_at,
      }));

    return {
      ...p,
      countA,
      countB,
      total: countA + countB,
      myChoice: myVote?.choice ?? null,
      comments,
    };
  });
}

/** 得票率（%）。総数 0 のときは 0 を返す。 */
export function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}
