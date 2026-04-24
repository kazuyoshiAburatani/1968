import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import {
  canPost,
  shouldLimitGuestReplies,
  GUEST_REPLY_LIMIT,
  type PostLevel,
} from "@/lib/auth/permissions";
import { RichText } from "@/components/rich-text";
import { MediaDisplay } from "@/components/media-display";
import { LikeButton } from "@/components/like-button";
import { ReportButton } from "@/components/report-button";
import type { MediaItem } from "@/lib/media";
import { createReply } from "./actions";

type Props = {
  params: Promise<{ slug: string; thread: string }>;
  searchParams: Promise<{ error?: string }>;
};

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  media: MediaItem[];
  created_at: string;
  reply_count: number;
  like_count: number;
  view_count: number;
  is_locked: boolean;
  user_id: string;
};

type ReplyRow = {
  id: string;
  body: string;
  media: MediaItem[];
  created_at: string;
  like_count: number;
  user_id: string;
  parent_reply_id: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { thread } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("threads")
    .select("title")
    .eq("id", thread)
    .maybeSingle();
  return { title: data?.title ?? "スレッド" };
}

export default async function ThreadDetailPage({ params, searchParams }: Props) {
  const { slug, thread: threadId } = await params;
  const { error } = await searchParams;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { rank, userId: viewerId } = await getCurrentRank(supabase);

  const { data: category } = await supabase
    .from("categories")
    .select("id, slug, name, access_level_post")
    .eq("slug", slug)
    .maybeSingle();

  if (!category) notFound();

  const { data: threadData } = await supabase
    .from("threads")
    .select(
      "id, title, body, media, created_at, reply_count, like_count, view_count, is_locked, user_id, category_id",
    )
    .eq("id", threadId)
    .maybeSingle();

  // RLS で閲覧不可／存在しない場合
  if (!threadData || threadData.category_id !== category.id) {
    notFound();
  }
  const thread = threadData as unknown as ThreadRow;

  const repliesLimited = shouldLimitGuestReplies(rank);

  let replyQuery = supabase
    .from("replies")
    .select("id, body, media, created_at, like_count, user_id, parent_reply_id")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (repliesLimited) {
    replyQuery = replyQuery.limit(GUEST_REPLY_LIMIT);
  }
  const { data: replies } = await replyQuery;
  const replyRows = (replies ?? []) as ReplyRow[];

  // 作者＋返信者のニックネームをまとめ取り
  const userIds = [
    thread.user_id,
    ...replyRows.map((r) => r.user_id),
  ];
  const uniqueUserIds = [...new Set(userIds)];
  const nickMap = new Map<string, string>();
  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname")
      .in("user_id", uniqueUserIds);
    for (const p of profiles ?? []) {
      nickMap.set(p.user_id as string, p.nickname as string);
    }
  }
  const authorName = nickMap.get(thread.user_id) ?? "（匿名）";

  // 現ユーザーの「いいね」一覧、スレッド本文＋閲覧可能な返信分
  const likedSet = new Set<string>();
  if (viewerId) {
    const targetIds = [threadId, ...replyRows.map((r) => r.id)];
    const { data: myLikes } = await supabase
      .from("likes")
      .select("target_type, target_id")
      .eq("user_id", viewerId)
      .in("target_id", targetIds);
    for (const l of myLikes ?? []) {
      likedSet.add(`${l.target_type}:${l.target_id}`);
    }
  }

  const canReply =
    !thread.is_locked && canPost(rank, category.access_level_post as PostLevel);
  const shouldShowGuestCta =
    repliesLimited && thread.reply_count > GUEST_REPLY_LIMIT;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-4 text-sm">
        <Link href={`/board/${slug}`}>← {category.name} へ戻る</Link>
      </nav>

      <article>
        <header>
          <h1 className="text-2xl font-bold leading-snug">{thread.title}</h1>
          <p className="mt-2 text-sm text-[color:var(--color-foreground)]/60">
            <Link href={`/u/${thread.user_id}`} className="underline">
              {authorName}
            </Link>
            {" ・ "}
            {new Date(thread.created_at).toLocaleString("ja-JP")}
            {" ・ "}
            返信{thread.reply_count}
            {" ・ "}
            閲覧{thread.view_count}
          </p>
        </header>
        <div className="mt-6">
          <RichText text={thread.body} />
          <MediaDisplay items={thread.media ?? []} />
        </div>
        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <LikeButton
            targetType="thread"
            targetId={thread.id}
            initialLiked={likedSet.has(`thread:${thread.id}`)}
            initialCount={thread.like_count}
          />
          <ReportButton targetType="thread" targetId={thread.id} />
        </div>
      </article>

      <hr className="my-10 border-[color:var(--color-border)]" />

      <section>
        <h2 className="font-bold">返信 {thread.reply_count > 0 && `(${thread.reply_count})`}</h2>
        {replyRows.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--color-foreground)]/60">
            まだ返信はありません。
          </p>
        ) : (
          <ol className="mt-4 space-y-6">
            {replyRows.map((r, i) => {
              const name = nickMap.get(r.user_id) ?? "（匿名）";
              const parentName = r.parent_reply_id
                ? (() => {
                    const parent = replyRows.find((x) => x.id === r.parent_reply_id);
                    return parent ? nickMap.get(parent.user_id) : null;
                  })()
                : null;
              return (
                <li
                  key={r.id}
                  id={`reply-${r.id}`}
                  className="border-l-2 border-[color:var(--color-border)] pl-4"
                >
                  <p className="text-sm text-[color:var(--color-foreground)]/70">
                    <span className="font-bold text-[color:var(--color-foreground)]">
                      #{i + 1} {name}
                    </span>
                    {" ・ "}
                    {new Date(r.created_at).toLocaleString("ja-JP")}
                    {parentName && (
                      <>
                        {" ・ "}@{parentName} へ返信
                      </>
                    )}
                  </p>
                  <div className="mt-2">
                    <RichText text={r.body} />
                    <MediaDisplay items={r.media ?? []} />
                  </div>
                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <LikeButton
                      targetType="reply"
                      targetId={r.id}
                      initialLiked={likedSet.has(`reply:${r.id}`)}
                      initialCount={r.like_count}
                    />
                    <ReportButton targetType="reply" targetId={r.id} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {shouldShowGuestCta && (
          <div className="mt-8 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 p-6 text-sm">
            <p className="font-bold">続きは会員の方にご覧いただけます。</p>
            <p className="mt-2 text-[color:var(--color-foreground)]/80">
              {thread.reply_count - GUEST_REPLY_LIMIT} 件の返信が隠れています。
              月額180円から、本音の語らいに加わってみませんか。
            </p>
            <p className="mt-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] font-medium no-underline hover:opacity-90"
              >
                新規登録する
              </Link>
            </p>
          </div>
        )}
      </section>

      <hr className="my-10 border-[color:var(--color-border)]" />

      <section>
        <h2 className="font-bold">返信を書く</h2>
        {thread.is_locked ? (
          <p className="mt-2 text-sm text-[color:var(--color-foreground)]/60">
            このスレッドはロックされているため返信できません。
          </p>
        ) : !canReply ? (
          <div className="mt-2 text-sm">
            <p>
              このカテゴリへの返信は
              {category.access_level_post === "associate" ? "準会員以上" : "正会員"}
              の方にお願いしています。
            </p>
            <p className="mt-4">
              <Link
                href={rank === "guest" ? "/register" : "/mypage"}
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] font-medium no-underline hover:opacity-90"
              >
                {rank === "guest" ? "新規登録する" : "マイページへ"}
              </Link>
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-2 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
                {decodeURIComponent(error)}
              </div>
            )}
            <form
              action={createReply}
              encType="multipart/form-data"
              className="mt-4 space-y-4"
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="thread_id" value={threadId} />
              <textarea
                name="body"
                required
                maxLength={3000}
                rows={6}
                placeholder="本文（3000文字以内）"
                className="w-full px-3 py-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
              />
              <fieldset className="space-y-2 text-sm">
                <legend className="text-[color:var(--color-foreground)]/70">
                  添付（任意、画像最大4枚 または 動画1本）
                </legend>
                <input
                  type="file"
                  name="images"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="block w-full text-sm"
                />
                <input
                  type="file"
                  name="video"
                  accept="video/mp4,video/quicktime"
                  className="block w-full text-sm"
                />
              </fieldset>
              <button
                type="submit"
                className="min-h-[var(--spacing-tap)] px-6 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] font-medium hover:opacity-90"
              >
                返信する
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
