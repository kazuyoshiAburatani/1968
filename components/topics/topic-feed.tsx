import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResponseCard, type ResponseReply } from "./response-card";
import { ResponseComposer } from "./response-composer";
import type { MediaItem } from "@/lib/media";
import type { ReactionType } from "@/lib/reactions";

// お題フィード、ホーム主コンテンツ。
// 複数のお題を新しい順に、各お題ごとに、
// - お題ヘッダー + 総回答数
// - Composer（最新お題のみ）
// - トップレベル回答 N 件プレビュー、各回答の下に返信ツリー
// - N 件以上なら「全ての答えを見る」で詳細ページへ
//
// パフォーマンス、topic 5 件 × 各 top-level 4 件 × 返信は取得トップの分だけ
// batch 化した 4 クエリ（topics / top-level responses / replies / likes / profiles）
// で描画までに 5〜6 回の Supabase 往復に抑える。

type TopicRow = {
  id: string;
  title: string;
  body: string;
  published_at: string;
  expires_at: string | null;
};

type ResponseRow = {
  id: string;
  topic_id: string;
  user_id: string;
  body: string;
  media: MediaItem[];
  created_at: string;
  admin_edited_at: string | null;
  parent_response_id: string | null;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  prefecture: string | null;
  avatar_url: string | null;
};

type LikeRow = {
  target_id: string;
  reaction_type: ReactionType;
  user_id: string;
};

// TOP に表示するお題数、フィードの垂直長のバランス
const TOPIC_LIMIT = 5;
// 各お題のトップレベル回答のプレビュー数
const TOP_LEVEL_PREVIEW = 4;

export async function TopicFeed() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ログイン中なら自分のプロフィール（Composer 用）
  let myProfile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname, prefecture, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    myProfile = data as ProfileRow | null;
  }

  // 1. アクティブなお題
  const now = new Date().toISOString();
  const { data: topicsData } = await supabase
    .from("topics")
    .select("id, title, body, published_at, expires_at")
    .eq("is_active", true)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .limit(TOPIC_LIMIT);
  const topics = (topicsData ?? []) as TopicRow[];

  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-background p-6 text-center">
        <i
          className="ri-chat-quote-line text-3xl text-foreground/40"
          aria-hidden
        />
        <p className="mt-2 text-sm text-foreground/70">
          今、アクティブなお題はありません。
          <br />
          運営から次のお題が届くまでお待ちください。
        </p>
      </div>
    );
  }

  const topicIds = topics.map((t) => t.id);

  // 2. トップレベル回答（parent NULL）を、各お題につき最新 N 件
  //    複数トピック分をまとめて取得、アプリ側で分配
  const { data: topLevelData } = await supabase
    .from("topic_responses")
    .select(
      "id, topic_id, user_id, body, media, created_at, admin_edited_at, parent_response_id",
    )
    .in("topic_id", topicIds)
    .is("parent_response_id", null)
    .order("created_at", { ascending: false })
    .limit(TOPIC_LIMIT * TOP_LEVEL_PREVIEW * 2);
  const allTopLevel = ((topLevelData ?? []) as unknown) as ResponseRow[];

  // トピックごとに TOP_LEVEL_PREVIEW 件まで
  const topLevelByTopic = new Map<string, ResponseRow[]>();
  for (const r of allTopLevel) {
    const list = topLevelByTopic.get(r.topic_id) ?? [];
    if (list.length < TOP_LEVEL_PREVIEW) {
      list.push(r);
      topLevelByTopic.set(r.topic_id, list);
    }
  }

  // 3. 上記トップレベルへの返信を一括で取得
  const shownTopLevelIds = Array.from(topLevelByTopic.values())
    .flat()
    .map((r) => r.id);
  let repliesData: ResponseRow[] = [];
  if (shownTopLevelIds.length > 0) {
    const { data } = await supabase
      .from("topic_responses")
      .select(
        "id, topic_id, user_id, body, media, created_at, admin_edited_at, parent_response_id",
      )
      .in("parent_response_id", shownTopLevelIds)
      .order("created_at", { ascending: true });
    repliesData = ((data ?? []) as unknown) as ResponseRow[];
  }
  const repliesByParent = new Map<string, ResponseRow[]>();
  for (const r of repliesData) {
    const parent = r.parent_response_id;
    if (!parent) continue;
    const list = repliesByParent.get(parent) ?? [];
    list.push(r);
    repliesByParent.set(parent, list);
  }

  // 4. 各お題の総回答数（返信含む）
  const { data: countData } = await supabase
    .from("topic_responses")
    .select("topic_id")
    .in("topic_id", topicIds);
  const totalCountByTopic = new Map<string, number>();
  for (const r of countData ?? []) {
    const tid = r.topic_id as string;
    totalCountByTopic.set(tid, (totalCountByTopic.get(tid) ?? 0) + 1);
  }

  // 5. プロフィール一括取得（トップレベル + 返信の全 user_id）
  const userIds = Array.from(
    new Set([
      ...allTopLevel.map((r) => r.user_id),
      ...repliesData.map((r) => r.user_id),
    ]),
  );
  let profilesData: ProfileRow[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname, prefecture, avatar_url")
      .in("user_id", userIds);
    profilesData = (data ?? []) as ProfileRow[];
  }
  const profileByUser = new Map(profilesData.map((p) => [p.user_id, p]));

  // 6. 全レス（トップレベル + 返信）の全リアクション一括取得
  const allResponseIds = [
    ...allTopLevel.map((r) => r.id),
    ...repliesData.map((r) => r.id),
  ];
  let likes: LikeRow[] = [];
  if (allResponseIds.length > 0) {
    const { data } = await supabase
      .from("likes")
      .select("target_id, reaction_type, user_id")
      .eq("target_type", "topic_response")
      .in("target_id", allResponseIds);
    likes = ((data ?? []) as unknown) as LikeRow[];
  }
  const countsByResponse = new Map<
    string,
    Partial<Record<ReactionType, number>>
  >();
  const myReactionByResponse = new Map<string, ReactionType>();
  for (const l of likes) {
    const c = countsByResponse.get(l.target_id) ?? {};
    c[l.reaction_type] = (c[l.reaction_type] ?? 0) + 1;
    countsByResponse.set(l.target_id, c);
    if (user && l.user_id === user.id) {
      myReactionByResponse.set(l.target_id, l.reaction_type);
    }
  }

  return (
    <div className="space-y-8">
      {topics.map((t, i) => {
        const topLevel = topLevelByTopic.get(t.id) ?? [];
        const totalCount = totalCountByTopic.get(t.id) ?? 0;
        return (
          <section key={t.id} className="space-y-3">
            {/* お題ヘッダー */}
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <i className="ri-chat-quote-line text-base" aria-hidden />
                {i === 0 ? "今週のお題" : "お題"}
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-foreground leading-snug">
                <Link
                  href={`/topics/${t.id}`}
                  className="text-foreground no-underline hover:underline"
                >
                  {t.title}
                </Link>
              </h2>
              {t.body && (
                <p className="mt-2 text-sm sm:text-base text-foreground/80 leading-7 whitespace-pre-wrap">
                  {t.body}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-foreground/60">
                <i className="ri-chat-3-line" aria-hidden />
                <span>{totalCount} 件の答え</span>
              </div>
            </div>

            {/* Composer は最新お題のみ、それ以外は詳細ページに任せて省略 */}
            {i === 0 && (
              <ResponseComposer
                topicId={t.id}
                nickname={myProfile?.nickname ?? "会員"}
                avatarPath={myProfile?.avatar_url}
                guest={!user}
              />
            )}

            {/* 回答プレビュー */}
            {topLevel.length === 0 ? (
              <p className="text-center text-sm text-foreground/60 py-6">
                このお題にはまだ答えがありません
                {i === 0 && "、一番乗りしませんか？"}
              </p>
            ) : (
              <div className="space-y-3">
                {topLevel.map((r) => {
                  const p = profileByUser.get(r.user_id);
                  const rawReplies = repliesByParent.get(r.id) ?? [];
                  const replies: ResponseReply[] = rawReplies.map((rp) => {
                    const rpProfile = profileByUser.get(rp.user_id);
                    return {
                      id: rp.id,
                      nickname: rpProfile?.nickname ?? "会員",
                      prefecture: rpProfile?.prefecture ?? null,
                      avatarPath: rpProfile?.avatar_url,
                      body: rp.body,
                      createdAt: rp.created_at,
                      reactionCounts: countsByResponse.get(rp.id) ?? {},
                      myReaction: myReactionByResponse.get(rp.id) ?? null,
                      adminEdited: !!rp.admin_edited_at,
                    };
                  });
                  return (
                    <ResponseCard
                      key={r.id}
                      responseId={r.id}
                      topicId={t.id}
                      nickname={p?.nickname ?? "会員"}
                      prefecture={p?.prefecture ?? null}
                      avatarPath={p?.avatar_url}
                      body={r.body}
                      media={r.media ?? []}
                      createdAt={r.created_at}
                      reactionCounts={countsByResponse.get(r.id) ?? {}}
                      myReaction={myReactionByResponse.get(r.id) ?? null}
                      replies={replies}
                      loggedIn={!!user}
                      returnPath="/"
                      adminEdited={!!r.admin_edited_at}
                    />
                  );
                })}
                {totalCount > topLevel.length + repliesData.filter(rp => topLevel.some(tl => tl.id === rp.parent_response_id)).length && (
                  <div className="text-center">
                    <Link
                      href={`/topics/${t.id}`}
                      className="inline-flex items-center px-5 py-2 rounded-full border-2 border-primary text-primary text-sm font-medium hover:bg-primary hover:text-white transition-colors no-underline"
                    >
                      このお題の全ての答え（{totalCount} 件）を見る →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
