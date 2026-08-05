import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAuthorInfo } from "@/lib/author-info";
import type { ReactionType } from "@/lib/reactions";
import type { ResponseReply } from "@/components/topics/response-card";

// お題と回答をまとめて読み出す。
// 件数分の往復が発生しないよう、必ず ID の配列でまとめて引く。

export type TopicRow = {
  id: string;
  title: string;
  body: string;
  format: string;
  blank_examples: string[];
  era: string | null;
  published_at: string;
};

type ResponseRow = {
  id: string;
  topic_id: string;
  user_id: string;
  body: string;
  created_at: string;
  parent_response_id: string | null;
  is_operator: boolean;
  featured_at: string | null;
  featured_note: string | null;
};

export type TopicWithResponses = {
  topic: TopicRow;
  totalCount: number;
  responses: {
    id: string;
    topicId: string;
    nickname: string;
    prefecture: string | null;
    avatarUrl: string | null;
    body: string;
    createdAt: string;
    reactionCounts: Partial<Record<ReactionType, number>>;
    myReaction: ReactionType | null;
    replies: ResponseReply[];
    isOperator: boolean;
    isFoundingMember: boolean;
    isMine: boolean;
    featuredAt: string | null;
    featuredNote: string | null;
  }[];
};

const TOP_LEVEL_PREVIEW = 4;

/** 公開中のお題を新しい順に取得する。 */
export async function loadTopics(
  supabase: SupabaseClient,
  opts: { limit?: number; topicId?: string },
): Promise<TopicRow[]> {
  const now = new Date().toISOString();
  let q = supabase
    .from("topics")
    .select("id, title, body, format, blank_examples, era, published_at")
    .eq("is_active", true)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false });

  if (opts.topicId) q = q.eq("id", opts.topicId);
  if (opts.limit) q = q.limit(opts.limit);

  const { data } = await q;
  return ((data ?? []) as unknown) as TopicRow[];
}

/**
 * お題ごとに回答（＋その返信）を組み立てる。
 * previewOnly = true のときは各お題につき先頭 4 件のトップレベル回答だけ。
 */
export async function loadTopicResponses(
  supabase: SupabaseClient,
  topics: TopicRow[],
  opts: { currentUserId: string | null; previewOnly: boolean },
): Promise<TopicWithResponses[]> {
  if (topics.length === 0) return [];
  const topicIds = topics.map((t) => t.id);

  const columns =
    "id, topic_id, user_id, body, created_at, parent_response_id, is_operator, featured_at, featured_note";

  // トップレベル回答
  let topQuery = supabase
    .from("topic_responses")
    .select(columns)
    .in("topic_id", topicIds)
    .is("parent_response_id", null)
    .order("created_at", { ascending: false });
  if (opts.previewOnly) {
    topQuery = topQuery.limit(topics.length * TOP_LEVEL_PREVIEW * 2);
  } else {
    topQuery = topQuery.limit(500);
  }
  const { data: topData } = await topQuery;
  const allTopLevel = ((topData ?? []) as unknown) as ResponseRow[];

  const topLevelByTopic = new Map<string, ResponseRow[]>();
  for (const r of allTopLevel) {
    const list = topLevelByTopic.get(r.topic_id) ?? [];
    if (!opts.previewOnly || list.length < TOP_LEVEL_PREVIEW) {
      list.push(r);
      topLevelByTopic.set(r.topic_id, list);
    }
  }

  // 表示するトップレベルへの返信
  const shownIds = Array.from(topLevelByTopic.values())
    .flat()
    .map((r) => r.id);
  let replies: ResponseRow[] = [];
  if (shownIds.length > 0) {
    const { data } = await supabase
      .from("topic_responses")
      .select(columns)
      .in("parent_response_id", shownIds)
      .order("created_at", { ascending: true });
    replies = ((data ?? []) as unknown) as ResponseRow[];
  }
  const repliesByParent = new Map<string, ResponseRow[]>();
  for (const r of replies) {
    if (!r.parent_response_id) continue;
    const list = repliesByParent.get(r.parent_response_id) ?? [];
    list.push(r);
    repliesByParent.set(r.parent_response_id, list);
  }

  // 総件数
  const { data: countData } = await supabase
    .from("topic_responses")
    .select("topic_id")
    .in("topic_id", topicIds);
  const totalByTopic = new Map<string, number>();
  for (const r of countData ?? []) {
    const tid = (r as { topic_id: string }).topic_id;
    totalByTopic.set(tid, (totalByTopic.get(tid) ?? 0) + 1);
  }

  // 書き手情報
  const authorIds = [
    ...allTopLevel.map((r) => r.user_id),
    ...replies.map((r) => r.user_id),
  ];
  const authors = await fetchAuthorInfo(supabase, authorIds);

  // リアクション
  const allIds = [...allTopLevel.map((r) => r.id), ...replies.map((r) => r.id)];
  const countsBy = new Map<string, Partial<Record<ReactionType, number>>>();
  const myReactionBy = new Map<string, ReactionType>();
  if (allIds.length > 0) {
    const { data } = await supabase
      .from("likes")
      .select("target_id, reaction_type, user_id")
      .eq("target_type", "topic_response")
      .in("target_id", allIds);
    type LikeRow = {
      target_id: string;
      reaction_type: ReactionType;
      user_id: string;
    };
    for (const l of ((data ?? []) as unknown) as LikeRow[]) {
      const c = countsBy.get(l.target_id) ?? {};
      c[l.reaction_type] = (c[l.reaction_type] ?? 0) + 1;
      countsBy.set(l.target_id, c);
      if (opts.currentUserId && l.user_id === opts.currentUserId) {
        myReactionBy.set(l.target_id, l.reaction_type);
      }
    }
  }

  const nameOf = (userId: string) =>
    authors.get(userId)?.nickname ?? "名無しの同級生";

  return topics.map((topic) => {
    const tops = topLevelByTopic.get(topic.id) ?? [];
    return {
      topic,
      totalCount: totalByTopic.get(topic.id) ?? 0,
      responses: tops.map((r) => {
        const a = authors.get(r.user_id);
        return {
          id: r.id,
          topicId: topic.id,
          nickname: nameOf(r.user_id),
          prefecture: a?.prefecture ?? null,
          avatarUrl: a?.avatarUrl ?? null,
          body: r.body,
          createdAt: r.created_at,
          reactionCounts: countsBy.get(r.id) ?? {},
          myReaction: myReactionBy.get(r.id) ?? null,
          isOperator: r.is_operator === true,
          isFoundingMember: a?.isFoundingMember === true,
          isMine: opts.currentUserId === r.user_id,
          featuredAt: r.featured_at,
          featuredNote: r.featured_note,
          replies: (repliesByParent.get(r.id) ?? []).map((rp) => {
            const ra = authors.get(rp.user_id);
            return {
              id: rp.id,
              nickname: nameOf(rp.user_id),
              prefecture: ra?.prefecture ?? null,
              avatarUrl: ra?.avatarUrl ?? null,
              body: rp.body,
              createdAt: rp.created_at,
              reactionCounts: countsBy.get(rp.id) ?? {},
              myReaction: myReactionBy.get(rp.id) ?? null,
              isOperator: rp.is_operator === true,
              isFoundingMember: ra?.isFoundingMember === true,
              isMine: opts.currentUserId === rp.user_id,
            } satisfies ResponseReply;
          }),
        };
      }),
    };
  });
}
