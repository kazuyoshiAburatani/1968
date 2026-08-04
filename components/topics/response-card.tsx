import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";
import { getMediaUrl, type MediaItem } from "@/lib/media";
import { ReactionRow } from "./reaction-row";
import type { ReactionType } from "@/lib/reactions";

// お題への 1 レス表示。
// アバター + ニックネーム + 都道府県 + 相対時刻 + 本文 + 添付 + リアクション。
// タイトル無し、本文中心のシンプルな縦積み。

type Props = {
  responseId: string;
  nickname: string;
  prefecture: string | null;
  avatarPath: string | null | undefined;
  body: string;
  media: MediaItem[];
  createdAt: string;
  reactionCounts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
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
  nickname,
  prefecture,
  avatarPath,
  body,
  media,
  createdAt,
  reactionCounts,
  myReaction,
  returnPath,
  adminEdited,
}: Props) {
  const images = media.filter((m) => m.type === "image");

  return (
    <article className="rounded-2xl border border-border/60 bg-background p-4 sm:p-5 shadow-sm">
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
    </article>
  );
}
