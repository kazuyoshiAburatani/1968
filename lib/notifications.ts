import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// 通知は専用テーブルではなく、その都度 replies / likes / messages を集約して算出する。
// パフォーマンスは limit を抑えてカバー、規模が大きくなったら notifications テーブルへ移行する。

export type Notification =
  | {
      kind: "reply_to_thread";
      replyId: string;
      threadId: string;
      threadTitle: string;
      categorySlug: string;
      actorId: string;
      actorName: string;
      actorAvatar: string | null;
      actorIsAi: boolean;
      bodyExcerpt: string;
      createdAt: string;
    }
  | {
      kind: "like_on_thread";
      threadId: string;
      threadTitle: string;
      categorySlug: string;
      actorId: string;
      actorName: string;
      actorAvatar: string | null;
      actorIsAi: boolean;
      createdAt: string;
    }
  | {
      kind: "like_on_reply";
      replyId: string;
      threadId: string;
      threadTitle: string;
      categorySlug: string;
      actorId: string;
      actorName: string;
      actorAvatar: string | null;
      actorIsAi: boolean;
      createdAt: string;
    }
  | {
      kind: "dm_received";
      messageId: string;
      peerId: string;
      peerName: string;
      peerAvatar: string | null;
      peerIsAi: boolean;
      bodyExcerpt: string;
      createdAt: string;
    };

import { publicAvatarUrl } from "@/lib/avatar";

export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  opts: { limit?: number } = {},
): Promise<{ items: Notification[]; lastSeenAt: string | null }> {
  const limit = opts.limit ?? 50;

  // 1. 最終既読時刻を取得
  const { data: u } = await supabase
    .from("users")
    .select("last_notifications_seen_at")
    .eq("id", userId)
    .maybeSingle();
  const lastSeenAt =
    (u?.last_notifications_seen_at as string | null | undefined) ?? null;

  // 2. 自分のスレッドへの返信、自分以外
  const { data: myThreads } = await supabase
    .from("threads")
    .select("id, title, categories(slug)")
    .eq("user_id", userId);
  const myThreadList = (myThreads ?? []) as unknown as Array<{
    id: string;
    title: string;
    categories: { slug: string } | null;
  }>;

  let replyRows: Array<{
    id: string;
    thread_id: string;
    user_id: string;
    body: string;
    created_at: string;
  }> = [];
  if (myThreadList.length > 0) {
    const threadIds = myThreadList.map((t) => t.id);
    const { data } = await supabase
      .from("replies")
      .select("id, thread_id, user_id, body, created_at")
      .in("thread_id", threadIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    replyRows = (data ?? []) as typeof replyRows;
  }

  // 3. 自分のスレッド／返信へのいいね、自分以外
  const { data: myReplies } = await supabase
    .from("replies")
    .select("id, thread_id")
    .eq("user_id", userId);
  const myReplyList = (myReplies ?? []) as Array<{
    id: string;
    thread_id: string;
  }>;

  const myThreadIds = myThreadList.map((t) => t.id);
  const myReplyIds = myReplyList.map((r) => r.id);
  const allTargets = [
    ...myThreadIds.map((id) => ({ type: "thread", id })),
    ...myReplyIds.map((id) => ({ type: "reply", id })),
  ];

  let likeRows: Array<{
    user_id: string;
    target_type: string;
    target_id: string;
    created_at: string;
  }> = [];
  if (allTargets.length > 0) {
    const allIds = allTargets.map((t) => t.id);
    const { data } = await supabase
      .from("likes")
      .select("user_id, target_type, target_id, created_at")
      .in("target_id", allIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    likeRows = (data ?? []) as typeof likeRows;
  }

  // 4. 自分宛の DM、相手の最新メッセージ
  const { data: dmRows } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("receiver_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const dmList = (dmRows ?? []) as Array<{
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
  }>;

  // 5. 関連ユーザー情報（プロフィール＋ AI フラグ）まとめ取り
  const actorIds = new Set<string>();
  for (const r of replyRows) actorIds.add(r.user_id);
  for (const l of likeRows) actorIds.add(l.user_id);
  for (const m of dmList) actorIds.add(m.sender_id);

  const profileMap = new Map<
    string,
    { nickname: string; avatar: string | null }
  >();
  const aiSet = new Set<string>();
  if (actorIds.size > 0) {
    const ids = Array.from(actorIds);
    const [{ data: profs }, { data: meta }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", ids),
      supabase
        .from("member_display")
        .select("user_id, is_ai_persona")
        .in("user_id", ids),
    ]);
    for (const p of profs ?? []) {
      profileMap.set(p.user_id as string, {
        nickname: p.nickname as string,
        avatar: publicAvatarUrl(p.avatar_url as string | null),
      });
    }
    for (const m of meta ?? []) {
      if (m.is_ai_persona === true) aiSet.add(m.user_id as string);
    }
  }

  const threadMap = new Map(myThreadList.map((t) => [t.id, t]));
  const replyToThreadMap = new Map(myReplyList.map((r) => [r.id, r.thread_id]));

  // 6. ノーマライズして 1 つの配列に
  const items: Notification[] = [];

  for (const r of replyRows) {
    const t = threadMap.get(r.thread_id);
    if (!t) continue;
    const actor = profileMap.get(r.user_id);
    items.push({
      kind: "reply_to_thread",
      replyId: r.id,
      threadId: r.thread_id,
      threadTitle: t.title,
      categorySlug: t.categories?.slug ?? "",
      actorId: r.user_id,
      actorName: actor?.nickname ?? "（匿名）",
      actorAvatar: actor?.avatar ?? null,
      actorIsAi: aiSet.has(r.user_id),
      bodyExcerpt: r.body.replace(/\s+/g, " ").slice(0, 80),
      createdAt: r.created_at,
    });
  }

  for (const l of likeRows) {
    const actor = profileMap.get(l.user_id);
    if (l.target_type === "thread") {
      const t = threadMap.get(l.target_id);
      if (!t) continue;
      items.push({
        kind: "like_on_thread",
        threadId: l.target_id,
        threadTitle: t.title,
        categorySlug: t.categories?.slug ?? "",
        actorId: l.user_id,
        actorName: actor?.nickname ?? "（匿名）",
        actorAvatar: actor?.avatar ?? null,
        actorIsAi: aiSet.has(l.user_id),
        createdAt: l.created_at,
      });
    } else if (l.target_type === "reply") {
      const tid = replyToThreadMap.get(l.target_id);
      if (!tid) continue;
      const t = threadMap.get(tid);
      // 自分のスレッドの自分の返信、または他人スレッドの自分の返信、いずれか
      let title = t?.title ?? "";
      let slug = t?.categories?.slug ?? "";
      if (!t) {
        // 他人のスレッドにある自分の返信、その親スレッドを取得
        const { data: parentThread } = await supabase
          .from("threads")
          .select("title, categories(slug)")
          .eq("id", tid)
          .maybeSingle();
        const pt = parentThread as unknown as
          | { title: string; categories: { slug: string } | null }
          | null;
        title = pt?.title ?? "";
        slug = pt?.categories?.slug ?? "";
      }
      items.push({
        kind: "like_on_reply",
        replyId: l.target_id,
        threadId: tid,
        threadTitle: title,
        categorySlug: slug,
        actorId: l.user_id,
        actorName: actor?.nickname ?? "（匿名）",
        actorAvatar: actor?.avatar ?? null,
        actorIsAi: aiSet.has(l.user_id),
        createdAt: l.created_at,
      });
    }
  }

  for (const m of dmList) {
    const peer = profileMap.get(m.sender_id);
    items.push({
      kind: "dm_received",
      messageId: m.id,
      peerId: m.sender_id,
      peerName: peer?.nickname ?? "（不明な方）",
      peerAvatar: peer?.avatar ?? null,
      peerIsAi: aiSet.has(m.sender_id),
      bodyExcerpt: m.body.replace(/\s+/g, " ").slice(0, 80),
      createdAt: m.created_at,
    });
  }

  // 7. 新しい順にソートして上限カット
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { items: items.slice(0, limit), lastSeenAt };
}

export function isUnread(item: Notification, lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return true;
  return new Date(item.createdAt).getTime() > new Date(lastSeenAt).getTime();
}

// ヘッダーやタブバーに表示する未読数のみを軽量に算出する。
// 全ての通知種別を厳密に集約するのは重いため、頻度の高い「自分宛 DM」と
// 「自分のスレッドへの新着返信」だけを対象にカウント。
export async function fetchUnreadNotificationsCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: u } = await supabase
    .from("users")
    .select("last_notifications_seen_at")
    .eq("id", userId)
    .maybeSingle();
  const lastSeenAt =
    (u?.last_notifications_seen_at as string | null | undefined) ?? null;

  const since = lastSeenAt ?? "1970-01-01T00:00:00.000Z";

  const { data: myThreads } = await supabase
    .from("threads")
    .select("id")
    .eq("user_id", userId);
  const threadIds = (myThreads ?? []).map((t) => t.id as string);

  const [{ count: dmCount }, { count: replyCount }] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .gt("created_at", since),
    threadIds.length > 0
      ? supabase
          .from("replies")
          .select("id", { count: "exact", head: true })
          .in("thread_id", threadIds)
          .neq("user_id", userId)
          .gt("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);

  return (dmCount ?? 0) + (replyCount ?? 0);
}
