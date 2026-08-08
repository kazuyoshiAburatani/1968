import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PollChoice } from "@/lib/polls";
import type { ArchivePoll, ArchiveTopic } from "@/lib/archive";

// 過去の二択とお題の読み出し。service_role の鍵を使うので、サーバからのみ。
//
// 件数の数え方について。
// 60 問ぶんの票を毎回ぜんぶ引いて数えると、票が増えたときに一覧が重くなる。
// 数えるのは Postgres 側（poll_vote_counts / topic_response_counts ビュー）に任せ、
// ここでは件数だけを受け取る。

/**
 * これまでに公開された二択をすべて取る。
 * 一言は付けない（一覧では出さないので、60 問ぶん引くと無駄が大きい）。
 */
export async function loadPollArchive(
  supabase: SupabaseClient,
  voterKey: string | null,
): Promise<ArchivePoll[]> {
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("polls")
    .select(
      "id, question, option_a, option_b, option_a_image, option_b_image, icon, era, published_at",
    )
    .eq("is_active", true)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false });

  const polls = (data ?? []) as Array<
    Omit<ArchivePoll, "total" | "comments" | "myChoice"> & {
      published_at: string;
    }
  >;
  if (polls.length === 0) return [];

  const ids = polls.map((p) => p.id);

  type CountRow = {
    poll_id: string;
    total: number;
    count_comments: number;
  };
  type MineRow = { poll_id: string; choice: PollChoice };

  const [{ data: countData }, { data: mineData }] = await Promise.all([
    supabase
      .from("poll_vote_counts")
      .select("poll_id, total, count_comments")
      .in("poll_id", ids),
    // 自分の票だけは voter_key で照合するので service_role で引く
    voterKey
      ? getSupabaseAdminClient()
          .from("poll_votes")
          .select("poll_id, choice")
          .eq("voter_key", voterKey)
          .in("poll_id", ids)
      : Promise.resolve({ data: [] as MineRow[] }),
  ]);

  const countBy = new Map(
    ((countData ?? []) as CountRow[]).map((c) => [c.poll_id, c]),
  );
  const mineBy = new Map(
    ((mineData ?? []) as MineRow[]).map((m) => [m.poll_id, m.choice]),
  );

  return polls.map((p) => ({
    id: p.id,
    question: p.question,
    option_a: p.option_a,
    option_b: p.option_b,
    option_a_image: p.option_a_image,
    option_b_image: p.option_b_image,
    icon: p.icon,
    era: p.era,
    total: Number(countBy.get(p.id)?.total ?? 0),
    comments: Number(countBy.get(p.id)?.count_comments ?? 0),
    myChoice: mineBy.get(p.id) ?? null,
  }));
}

/**
 * これまでに公開されたお題をすべて取る。
 * 記事に紐づくお題は、記事のほうから読んでもらうのでここには出さない。
 */
export async function loadTopicArchive(
  supabase: SupabaseClient,
  currentUserId: string | null,
): Promise<ArchiveTopic[]> {
  const now = new Date().toISOString();

  const [{ data: topicData }, { data: storyData }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, format, era, published_at")
      .eq("is_active", true)
      .eq("audience", "all")
      .lte("published_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("published_at", { ascending: false }),
    supabase.from("stories").select("topic_id").not("topic_id", "is", null),
  ]);

  const linked = new Set(
    ((storyData ?? []) as { topic_id: string | null }[])
      .map((s) => s.topic_id)
      .filter((v): v is string => v !== null),
  );

  const topics = ((topicData ?? []) as Array<{
    id: string;
    title: string;
    format: string;
    era: string | null;
    published_at: string;
  }>).filter((t) => !linked.has(t.id));

  if (topics.length === 0) return [];

  const ids = topics.map((t) => t.id);

  const [{ data: countData }, { data: mineData }] = await Promise.all([
    supabase
      .from("topic_response_counts")
      .select("topic_id, total")
      .in("topic_id", ids),
    currentUserId
      ? supabase
          .from("topic_responses")
          .select("topic_id")
          .eq("user_id", currentUserId)
          .in("topic_id", ids)
      : Promise.resolve({ data: [] as { topic_id: string }[] }),
  ]);

  const countBy = new Map(
    ((countData ?? []) as { topic_id: string; total: number }[]).map((c) => [
      c.topic_id,
      Number(c.total),
    ]),
  );
  const mine = new Set(
    ((mineData ?? []) as { topic_id: string }[]).map((m) => m.topic_id),
  );

  return topics.map((t) => ({
    id: t.id,
    title: t.title,
    format: t.format,
    era: t.era,
    total: countBy.get(t.id) ?? 0,
    mine: mine.has(t.id),
  }));
}
