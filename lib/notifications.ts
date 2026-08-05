import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAuthorInfo } from "@/lib/author-info";
import { REACTION_META, type ReactionType } from "@/lib/reactions";

// お知らせ。
//
// 撤去した掲示板と DM を外し、いまの構成で「自分に向けて起きたこと」だけに絞った。
//   1. 自分の投稿への返信（運営からの返信を含む）
//   2. お便り紹介への採用
//   3. 自分の投稿へのリアクション
//
// とくに 1 と 2 が重要で、検証では「返事が来たことに気づけるかどうか」で
// 定着スコアが 8 と 3 のあいだを行き来した。通知が届かなければ、
// 返信という施策そのものが存在しないのと同じになる。

export type Notification =
  | {
      kind: "reply";
      id: string;
      createdAt: string;
      topicId: string;
      responseId: string;
      actorName: string;
      actorAvatarUrl: string | null;
      isOperator: boolean;
      excerpt: string;
    }
  | {
      kind: "featured";
      id: string;
      createdAt: string;
      topicId: string;
      responseId: string;
      excerpt: string;
      note: string | null;
    }
  | {
      kind: "reaction";
      id: string;
      createdAt: string;
      topicId: string;
      responseId: string;
      reaction: ReactionType;
      reactionLabel: string;
      excerpt: string;
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

export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  opts: { limit?: number } = {},
): Promise<{ items: Notification[]; lastSeenAt: string | null }> {
  const limit = opts.limit ?? 50;

  const { data: userRow } = await supabase
    .from("users")
    .select("last_notifications_seen_at")
    .eq("id", userId)
    .maybeSingle();
  const lastSeenAt =
    (userRow?.last_notifications_seen_at as string | null) ?? null;

  // 自分の投稿
  const { data: mineData } = await supabase
    .from("topic_responses")
    .select(
      "id, topic_id, user_id, body, created_at, parent_response_id, is_operator, featured_at, featured_note",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  const mine = ((mineData ?? []) as unknown) as ResponseRow[];

  if (mine.length === 0) return { items: [], lastSeenAt };

  const mineById = new Map(mine.map((r) => [r.id, r]));
  const mineIds = mine.map((r) => r.id);

  // 1. 自分の投稿への返信
  const { data: replyData } = await supabase
    .from("topic_responses")
    .select(
      "id, topic_id, user_id, body, created_at, parent_response_id, is_operator, featured_at, featured_note",
    )
    .in("parent_response_id", mineIds)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const replies = ((replyData ?? []) as unknown) as ResponseRow[];

  // 3. 自分の投稿へのリアクション
  const { data: likeData } = await supabase
    .from("likes")
    .select("user_id, target_id, reaction_type, created_at")
    .eq("target_type", "topic_response")
    .in("target_id", mineIds)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  type LikeRow = {
    user_id: string;
    target_id: string;
    reaction_type: ReactionType;
    created_at: string;
  };
  const likes = ((likeData ?? []) as unknown) as LikeRow[];

  const authors = await fetchAuthorInfo(
    supabase,
    replies.map((r) => r.user_id),
  );

  const items: Notification[] = [];

  for (const r of replies) {
    const parent = r.parent_response_id
      ? mineById.get(r.parent_response_id)
      : undefined;
    items.push({
      kind: "reply",
      id: `reply-${r.id}`,
      createdAt: r.created_at,
      topicId: parent?.topic_id ?? r.topic_id,
      responseId: r.id,
      actorName: authors.get(r.user_id)?.nickname ?? "名無しの同級生",
      actorAvatarUrl: authors.get(r.user_id)?.avatarUrl ?? null,
      isOperator: r.is_operator === true,
      excerpt: excerptOf(r.body),
    });
  }

  for (const r of mine) {
    if (!r.featured_at) continue;
    items.push({
      kind: "featured",
      id: `featured-${r.id}`,
      createdAt: r.featured_at,
      topicId: r.topic_id,
      responseId: r.id,
      excerpt: excerptOf(r.body),
      note: r.featured_note,
    });
  }

  for (const l of likes) {
    const target = mineById.get(l.target_id);
    if (!target) continue;
    items.push({
      kind: "reaction",
      id: `reaction-${l.target_id}-${l.user_id}-${l.reaction_type}`,
      createdAt: l.created_at,
      topicId: target.topic_id,
      responseId: l.target_id,
      reaction: l.reaction_type,
      reactionLabel: REACTION_META[l.reaction_type]?.label ?? "リアクション",
      excerpt: excerptOf(target.body),
    });
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return { items: items.slice(0, limit), lastSeenAt };
}

export function isUnread(
  item: Notification,
  lastSeenAt: string | null,
): boolean {
  if (!lastSeenAt) return true;
  return item.createdAt > lastSeenAt;
}

export async function fetchUnreadNotificationsCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { items, lastSeenAt } = await fetchNotifications(supabase, userId, {
    limit: 100,
  });
  return items.filter((i) => isUnread(i, lastSeenAt)).length;
}

function excerptOf(body: string, max = 60): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max) + "…" : flat;
}
