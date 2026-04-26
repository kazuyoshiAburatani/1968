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
import { RealtimeRepliesWatcher } from "@/components/realtime-replies-watcher";
import { ViewTracker } from "@/components/view-tracker";
import { SubmitButton } from "@/components/submit-button";
import { MediaPicker } from "@/components/media-picker";
import { OwnReplyBubble } from "@/components/own-reply-bubble";
import { AdminModToolbar } from "@/components/admin-mod-toolbar";
import { UserAvatar } from "@/components/user-avatar";
import { fetchAuthorInfo } from "@/lib/author-info";
import { fetchCategoryBySlug } from "@/lib/cached-categories";
import type { MediaItem } from "@/lib/media";
import { createReply } from "./actions";

function AiBadge() {
  return (
    <span className="inline-block px-1.5 py-px rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 align-middle ml-1">
      運営AI
    </span>
  );
}

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

  // viewer が運営かどうか、ツールバー表示の判定に使う
  let isAdmin = false;
  if (viewerId) {
    const { data: a } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", viewerId)
      .maybeSingle();
    isAdmin = !!a;
  }

  const category = await fetchCategoryBySlug(slug);
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

  // 作者＋返信者のニックネーム＋ランク＋AI 判定をまとめ取り
  const authorMap = await fetchAuthorInfo(supabase, [
    thread.user_id,
    ...replyRows.map((r) => r.user_id),
  ]);
  const author = authorMap.get(thread.user_id);
  const authorName = author?.nickname ?? "（匿名）";
  const authorIsAi = author?.isAi === true;
  const authorAvatar = author?.avatarUrl ?? null;

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
    <div className="mx-auto max-w-2xl flex flex-col min-h-[calc(100dvh-4rem)] md:min-h-0">
      <ViewTracker threadId={threadId} />

      {/* スティッキーヘッダー */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-3 py-2.5 flex items-center gap-2">
        <Link
          href={`/board/${slug}`}
          aria-label={`${category.name} へ戻る`}
          className="text-foreground/70 active:bg-muted -m-1 p-2 rounded"
        >
          <i className="ri-arrow-left-line text-xl" aria-hidden />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground/60 leading-tight">
            {category.name}
          </p>
          <h1 className="font-bold text-base leading-tight truncate">
            {thread.title}
          </h1>
        </div>
        <span className="text-xs text-foreground/50 shrink-0">
          {thread.reply_count} 返信
        </span>
      </header>

      {/* 会話エリア */}
      <div className="flex-1 px-3 py-4 space-y-4 bg-muted/15">
        {/* 元投稿、強調カードとして上部に */}
        <ThreadOriginalCard
          threadId={thread.id}
          slug={slug}
          authorId={thread.user_id}
          authorName={authorName}
          authorIsAi={authorIsAi}
          authorAvatar={authorAvatar}
          title={thread.title}
          body={thread.body}
          media={thread.media ?? []}
          createdAt={thread.created_at}
          likeCount={thread.like_count}
          liked={likedSet.has(`thread:${thread.id}`)}
          isOwner={viewerId === thread.user_id}
          isAdmin={isAdmin}
        />

        {/* 返信、左右バブル */}
        <RealtimeRepliesWatcher threadId={threadId} currentUserId={viewerId} />
        {replyRows.length > 0 && (
          <ul className="space-y-2.5">
            {replyRows.map((r, i) => {
              const replyAuthor = authorMap.get(r.user_id);
              const name = replyAuthor?.nickname ?? "（匿名）";
              const replyIsAi = replyAuthor?.isAi === true;
              const replyAvatar = replyAuthor?.avatarUrl ?? null;
              const mine = viewerId === r.user_id;
              const parentName = r.parent_reply_id
                ? (() => {
                    const parent = replyRows.find(
                      (x) => x.id === r.parent_reply_id,
                    );
                    if (!parent) return null;
                    return (
                      authorMap.get(parent.user_id)?.nickname ?? null
                    );
                  })()
                : null;
              const showDate =
                i === 0 ||
                new Date(r.created_at).toDateString() !==
                  new Date(replyRows[i - 1].created_at).toDateString();
              return (
                <li key={r.id} id={`reply-${r.id}`}>
                  {showDate && (
                    <p className="text-center text-xs text-foreground/60 my-3">
                      {new Date(r.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  <ReplyBubble
                    replyId={r.id}
                    slug={slug}
                    threadId={threadId}
                    body={r.body}
                    media={r.media ?? []}
                    createdAt={r.created_at}
                    likeCount={r.like_count}
                    liked={likedSet.has(`reply:${r.id}`)}
                    name={name}
                    authorId={r.user_id}
                    isAi={replyIsAi}
                    avatarUrl={replyAvatar}
                    mine={mine}
                    parentName={parentName}
                    isAdmin={isAdmin}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {shouldShowGuestCta && (
          <div className="mt-4 rounded-2xl border border-border bg-background p-5 text-sm">
            <p className="font-bold">続きは会員の方にご覧いただけます。</p>
            <p className="mt-2 text-foreground/80">
              {thread.reply_count - GUEST_REPLY_LIMIT} 件の返信が隠れています。
              月額480円から、本音の語らいに加わってみませんか。
            </p>
            <p className="mt-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-medium no-underline active:opacity-90"
              >
                新規登録する
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* 入力エリア、固定 */}
      <div className="sticky bottom-0 bg-background border-t border-border px-3 py-3">
        {error && (
          <p className="mb-2 px-2 text-xs text-red-700">
            {decodeURIComponent(error)}
          </p>
        )}
        {thread.is_locked ? (
          <p className="px-2 py-3 text-sm text-foreground/60">
            このスレッドはロックされているため返信できません。
          </p>
        ) : !canReply ? (
          <div className="px-2 py-2 text-sm text-foreground/70">
            <p>
              このカテゴリへの返信は
              {category.access_level_post === "member" ? "会員登録" : "正会員"}
              の方にお願いしています。
            </p>
            <p className="mt-2">
              <Link
                href={rank === "guest" ? "/register" : "/mypage"}
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white font-medium no-underline active:opacity-90"
              >
                {rank === "guest" ? "新規登録する" : "マイページへ"}
              </Link>
            </p>
          </div>
        ) : (
          <form
            action={createReply}
            encType="multipart/form-data"
            className="space-y-2"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="thread_id" value={threadId} />
            <div className="flex items-end gap-2">
              <textarea
                name="body"
                required
                maxLength={3000}
                rows={1}
                placeholder="返信を入力"
                className="flex-1 px-3 py-2 rounded-2xl border border-border bg-background resize-none min-h-[44px] max-h-32 text-sm leading-6"
              />
              <SubmitButton pendingText="送信中…">送信</SubmitButton>
            </div>
            <MediaPicker />
          </form>
        )}
      </div>
    </div>
  );
}

// 元投稿のカード、上部に強調表示
function ThreadOriginalCard(props: {
  threadId: string;
  slug: string;
  authorId: string;
  authorName: string;
  authorIsAi: boolean;
  authorAvatar: string | null;
  title: string;
  body: string;
  media: MediaItem[];
  createdAt: string;
  likeCount: number;
  liked: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  return (
    <article className="rounded-2xl border border-primary/30 bg-background p-4 shadow-sm">
      <header className="flex items-center gap-2.5">
        <UserAvatar
          name={props.authorName}
          avatarUrl={props.authorAvatar}
          isAi={props.authorIsAi}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm flex items-center gap-1.5 truncate">
            <Link
              href={`/u/${props.authorId}`}
              className="no-underline hover:underline truncate"
            >
              {props.authorName}
            </Link>
            {props.authorIsAi && <AiBadge />}
          </p>
          <p className="text-xs text-foreground/60">
            {new Date(props.createdAt).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </header>
      <h2 className="mt-3 text-lg font-bold leading-snug">{props.title}</h2>
      <div className="mt-2 text-sm leading-7">
        <RichText text={props.body} />
        <MediaDisplay items={props.media} />
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <LikeButton
          targetType="thread"
          targetId={props.threadId}
          initialLiked={props.liked}
          initialCount={props.likeCount}
        />
        <ReportButton targetType="thread" targetId={props.threadId} />
        {props.isOwner && (
          <Link
            href={`/board/${props.slug}/${props.threadId}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border bg-background hover:bg-muted text-xs font-medium ml-auto no-underline"
          >
            <i className="ri-pencil-line text-xs" aria-hidden />
            編集
          </Link>
        )}
      </div>
      {/* 運営モデレーション、運営アカウントのみ表示 */}
      {props.isAdmin && !props.isOwner && (
        <AdminModToolbar
          kind="thread"
          slug={props.slug}
          threadId={props.threadId}
          title={props.title}
          body={props.body}
        />
      )}
    </article>
  );
}

// 返信バブル、自分は右、他人は左
function ReplyBubble(props: {
  replyId: string;
  slug: string;
  threadId: string;
  body: string;
  media: MediaItem[];
  createdAt: string;
  likeCount: number;
  liked: boolean;
  name: string;
  authorId: string;
  isAi: boolean;
  avatarUrl: string | null;
  mine: boolean;
  parentName: string | null;
  isAdmin: boolean;
}) {
  const timeMeta = (
    <span>
      {new Date(props.createdAt).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );

  return (
    <div
      className={`flex items-end gap-2 ${props.mine ? "justify-end" : "justify-start"}`}
    >
      {!props.mine && (
        <Link
          href={`/u/${props.authorId}`}
          className="shrink-0 no-underline"
          aria-label={`${props.name} のプロフィール`}
        >
          <UserAvatar
            name={props.name}
            avatarUrl={props.avatarUrl}
            isAi={props.isAi}
            size={36}
          />
        </Link>
      )}
      <div className={`max-w-[80%] ${props.mine ? "items-end" : "items-start"} flex flex-col`}>
        {!props.mine && (
          <p className="text-xs text-foreground/70 mb-0.5 px-1 flex items-center gap-1">
            <span>{props.name}</span>
            {props.isAi && <AiBadge />}
          </p>
        )}
        {props.parentName && (
          <p className="text-[10px] text-foreground/50 mb-0.5 px-1">
            ↳ @{props.parentName} へ
          </p>
        )}
        {props.mine ? (
          <OwnReplyBubble
            replyId={props.replyId}
            body={props.body}
            media={props.media}
            pathToRevalidate={`/board/${props.slug}/${props.threadId}`}
            metaRow={
              <>
                {timeMeta}
                <LikeButton
                  targetType="reply"
                  targetId={props.replyId}
                  initialLiked={props.liked}
                  initialCount={props.likeCount}
                />
              </>
            }
          />
        ) : (
          <>
            <div className="rounded-2xl px-4 py-2.5 leading-7 text-sm whitespace-pre-wrap bg-background border border-border rounded-bl-sm">
              <RichText text={props.body} />
              {props.media && props.media.length > 0 && (
                <div className="mt-2">
                  <MediaDisplay items={props.media} />
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-foreground/50 justify-start flex-wrap">
              {timeMeta}
              <LikeButton
                targetType="reply"
                targetId={props.replyId}
                initialLiked={props.liked}
                initialCount={props.likeCount}
              />
              <ReportButton targetType="reply" targetId={props.replyId} />
            </div>
            {/* 運営モデレーション、運営アカウントのみ表示 */}
            {props.isAdmin && (
              <AdminModToolbar
                kind="reply"
                slug={props.slug}
                threadId={props.threadId}
                replyId={props.replyId}
                body={props.body}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

