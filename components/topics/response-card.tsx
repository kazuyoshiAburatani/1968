import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";
import { getMediaUrl, type MediaItem } from "@/lib/media";
import { ReactionRow } from "./reaction-row";
import { postTopicResponse } from "@/app/topics/actions";
import type { ReactionType } from "@/lib/reactions";

// お題への 1 レス表示、返信ツリー対応。
// 親カードの下に返信リスト（インデント表示）と、開閉式の返信フォームを持つ。
// details/summary で JS 無しでも開閉できる。

export type ResponseReply = {
  id: string;
  nickname: string;
  prefecture: string | null;
  avatarPath: string | null | undefined;
  body: string;
  createdAt: string;
  reactionCounts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
  adminEdited?: boolean;
};

type Props = {
  responseId: string;
  topicId: string;
  nickname: string;
  prefecture: string | null;
  avatarPath: string | null | undefined;
  body: string;
  media: MediaItem[];
  createdAt: string;
  reactionCounts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
  replies?: ResponseReply[];
  loggedIn?: boolean;
  returnPath?: string;
  adminEdited?: boolean;
};

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function ResponseCard({
  responseId,
  topicId,
  nickname,
  prefecture,
  avatarPath,
  body,
  media,
  createdAt,
  reactionCounts,
  myReaction,
  replies = [],
  loggedIn = false,
  returnPath = "/",
  adminEdited,
}: Props) {
  const images = media.filter((m) => m.type === "image");

  return (
    <article
      id={`response-${responseId}`}
      className="rounded-2xl border border-border/60 bg-background p-4 sm:p-5 shadow-sm scroll-mt-20"
    >
      <header className="flex items-center gap-3">
        <UserAvatar
          name={nickname}
          avatarUrl={publicAvatarUrl(avatarPath)}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/u/${encodeURIComponent(nickname)}`}
              className="text-sm sm:text-base font-semibold text-foreground no-underline hover:underline"
            >
              {nickname}
            </Link>
            {prefecture && (
              <span className="text-xs text-foreground/60">{prefecture}</span>
            )}
          </div>
          <div className="text-xs text-foreground/50">
            {formatRelative(createdAt)}
            {adminEdited && (
              <>
                <span className="mx-1.5">・</span>
                <span className="text-amber-800">運営により編集済み</span>
              </>
            )}
          </div>
        </div>
      </header>

      {body && (
        <p className="mt-3 text-sm sm:text-base leading-7 text-foreground whitespace-pre-wrap break-words">
          {body}
        </p>
      )}

      {images.length > 0 && (
        <div
          className={
            "mt-3 grid gap-2 " +
            (images.length === 1
              ? "grid-cols-1"
              : images.length === 2
                ? "grid-cols-2"
                : "grid-cols-3")
          }
        >
          {images.slice(0, 4).map((m) => (
            <div
              key={m.path}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <Image
                src={getMediaUrl(m.path)}
                alt="添付画像"
                fill
                sizes="(min-width: 768px) 33vw, 50vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ReactionRow
          targetType="topic_response"
          targetId={responseId}
          counts={reactionCounts}
          myReaction={myReaction}
          returnPath={returnPath}
        />
      </div>

      {/* 返信ツリー、常時表示（数が少ないうちはそれで十分） */}
      {replies.length > 0 && (
        <ul className="mt-4 space-y-3 border-l-2 border-primary/20 pl-3 sm:pl-4 ml-2 sm:ml-4">
          {replies.map((r) => (
            <li
              key={r.id}
              id={`response-${r.id}`}
              className="scroll-mt-20"
            >
              <div className="flex items-start gap-2.5">
                <UserAvatar
                  name={r.nickname}
                  avatarUrl={publicAvatarUrl(r.avatarPath)}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/u/${encodeURIComponent(r.nickname)}`}
                      className="text-sm font-semibold text-foreground no-underline hover:underline"
                    >
                      {r.nickname}
                    </Link>
                    {r.prefecture && (
                      <span className="text-xs text-foreground/60">
                        {r.prefecture}
                      </span>
                    )}
                    <span className="text-xs text-foreground/50">
                      ・{formatRelative(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-7 whitespace-pre-wrap break-words">
                    {r.body}
                  </p>
                  {r.adminEdited && (
                    <p className="mt-0.5 text-[11px] text-amber-800">
                      運営により編集済み
                    </p>
                  )}
                  <div className="mt-2">
                    <ReactionRow
                      targetType="topic_response"
                      targetId={r.id}
                      counts={r.reactionCounts}
                      myReaction={r.myReaction}
                      returnPath={returnPath}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 返信フォーム、details/summary で開閉、JS 不要 */}
      {loggedIn && (
        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline">
            <i
              className="ri-reply-line text-sm group-open:hidden"
              aria-hidden
            />
            <i
              className="ri-close-line text-sm hidden group-open:inline"
              aria-hidden
            />
            <span className="group-open:hidden">返信する</span>
            <span className="hidden group-open:inline">閉じる</span>
          </summary>
          <form
            action={postTopicResponse}
            className="mt-2 pl-3 sm:pl-4 ml-2 sm:ml-4 border-l-2 border-primary/20"
          >
            <input type="hidden" name="topic_id" value={topicId} />
            <input
              type="hidden"
              name="parent_response_id"
              value={responseId}
            />
            <input type="hidden" name="return_path" value={returnPath} />
            <textarea
              name="body"
              rows={2}
              maxLength={500}
              required
              placeholder={`${nickname} さんへ返信…`}
              className="w-full resize-y rounded-lg border border-border bg-page px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center min-h-[36px] px-4 rounded-full bg-primary text-white text-xs font-medium hover:opacity-90"
              >
                返信を送る
              </button>
            </div>
          </form>
        </details>
      )}
    </article>
  );
}
