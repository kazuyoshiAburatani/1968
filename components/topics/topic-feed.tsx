import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResponseCard } from "./response-card";
import { ResponseComposer } from "./response-composer";
import type { MediaItem } from "@/lib/media";
import type { ReactionType } from "@/lib/reactions";

// お題フィード、ホームの主コンテンツ。
// アクティブな topics を新しい順に走査し、各お題に紐づく最新レス数件を表示。
// 各レスにはリアクション 6 種、ログイン中は自分の反応がハイライトされる。

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

// 表示するお題数、フィード全体のスクロール長のバランス
const TOPIC_LIMIT = 3;
// 各お題ごとに表示するレス数
const RESPONSE_LIMIT_PER_TOPIC = 6;

export async function TopicFeed() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ログイン中なら自分のプロフィールを取得（Composer 用）
  let myProfile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname, prefecture, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    myProfile = data as ProfileRow | null;
  }

  // アクティブなお題を新しい順に
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

  // 各お題のレスを一括取得（複数トピック分をまとめて 1 クエリ、あとで分配）
  const topicIds = topics.map((t) => t.id);
  const { data: responsesData } = await supabase
    .from("topic_responses")
    .select(
      "id, topic_id, user_id, body, media, created_at, admin_edited_at",
    )
    .in("topic_id", topicIds)
    .order("created_at", { ascending: false })
    .limit(TOPIC_LIMIT * RESPONSE_LIMIT_PER_TOPIC * 2);
  const responses = ((responsesData ?? []) as unknown) as ResponseRow[];

  // トピックごとに分配、各 RESPONSE_LIMIT_PER_TOPIC 件まで
  const responsesByTopic = new Map<string, ResponseRow[]>();
  for (const r of responses) {
    const list = responsesByTopic.get(r.topic_id) ?? [];
    if (list.length < RESPONSE_LIMIT_PER_TOPIC) {
      list.push(r);
      responsesByTopic.set(r.topic_id, list);
    }
  }

  // 全ユーザーのプロフィールを一括取得
  const userIds = Array.from(new Set(responses.map((r) => r.user_id)));
  let profilesData: ProfileRow[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname, prefecture, avatar_url")
      .in("user_id", userIds);
    profilesData = (data ?? []) as ProfileRow[];
  }
  const profileByUser = new Map(profilesData.map((p) => [p.user_id, p]));

  // 全レスへの全リアクションを一括取得、target_id ごと reaction_type ごとに集計
  const responseIds = responses.map((r) => r.id);
  let likes: LikeRow[] = [];
  if (responseIds.length > 0) {
    const { data } = await supabase
      .from("likes")
      .select("target_id, reaction_type, user_id")
      .eq("target_type", "topic_response")
      .in("target_id", responseIds);
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
        const list = responsesByTopic.get(t.id) ?? [];
        return (
          <section key={t.id} className="space-y-3">
            {/* お題ヘッダー */}
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <i className="ri-chat-quote-line text-base" aria-hidden />
                {i === 0 ? "今週のお題" : "過去のお題"}
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-foreground leading-snug">
                {t.title}
              </h2>
              {t.body && (
                <p className="mt-2 text-sm sm:text-base text-foreground/80 leading-7 whitespace-pre-wrap">
                  {t.body}
                </p>
              )}
              <div className="mt-2 text-xs text-foreground/50">
                {list.length} 件の答え
              </div>
            </div>

            {/* Composer、i === 0（最新のお題）だけ表示、過去お題は投稿不可 UI */}
            {i === 0 && (
              <ResponseComposer
                topicId={t.id}
                nickname={myProfile?.nickname ?? "会員"}
                avatarPath={myProfile?.avatar_url}
                guest={!user}
              />
            )}

            {/* レス一覧 */}
            {list.length === 0 ? (
              <p className="text-center text-sm text-foreground/60 py-6">
                このお題にはまだ答えがありません
                {i === 0 && "、一番乗りしませんか？"}
              </p>
            ) : (
              <div className="space-y-3">
                {list.map((r) => {
                  const p = profileByUser.get(r.user_id);
                  return (
                    <ResponseCard
                      key={r.id}
                      responseId={r.id}
                      nickname={p?.nickname ?? "会員"}
                      prefecture={p?.prefecture ?? null}
                      avatarPath={p?.avatar_url}
                      body={r.body}
                      media={r.media ?? []}
                      createdAt={r.created_at}
                      reactionCounts={countsByResponse.get(r.id) ?? {}}
                      myReaction={myReactionByResponse.get(r.id) ?? null}
                      returnPath="/"
                      adminEdited={!!r.admin_edited_at}
                    />
                  );
                })}
                {list.length >= RESPONSE_LIMIT_PER_TOPIC && (
                  <div className="text-center">
                    <Link
                      href={`/topics/${t.id}`}
                      className="inline-flex items-center px-5 py-2 rounded-full border-2 border-primary text-primary text-sm font-medium hover:bg-primary hover:text-white transition-colors no-underline"
                    >
                      このお題の全ての答えを見る →
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
