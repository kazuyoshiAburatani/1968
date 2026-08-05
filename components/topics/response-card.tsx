import { UserAvatar } from "@/components/user-avatar";
import { MembershipBadge } from "@/components/membership-badge";
import { RichText } from "@/components/rich-text";
import { ReactionRow } from "./reaction-row";
import { postTopicResponse, deleteOwnResponse } from "@/app/topics/actions";
import type { ReactionType } from "@/lib/reactions";

// お題への回答カード。
//
// ここで表現しなければならないこと、
//  ・運営からの返信は一目で分かること（必ず返事が来る場だと伝わる）
//  ・「今週のお便り」に採用された投稿が誇らしく見えること
//  ・返信欄が常に開いていること。「返信」を押してから書く一手間で会話が止まる
//  ・自分の投稿は自分で消せること

export type ResponseReply = {
  id: string;
  nickname: string;
  prefecture: string | null;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  reactionCounts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
  isOperator: boolean;
  isFoundingMember: boolean;
  isMine: boolean;
};

type Props = {
  responseId: string;
  topicId: string;
  nickname: string;
  prefecture: string | null;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  reactionCounts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
  replies: ResponseReply[];
  loggedIn: boolean;
  returnPath: string;
  isOperator: boolean;
  isFoundingMember: boolean;
  isMine: boolean;
  featuredAt: string | null;
  featuredNote: string | null;
};

export function ResponseCard({
  responseId,
  topicId,
  nickname,
  prefecture,
  avatarUrl,
  body,
  createdAt,
  reactionCounts,
  myReaction,
  replies,
  loggedIn,
  returnPath,
  isOperator,
  isFoundingMember,
  isMine,
  featuredAt,
  featuredNote,
}: Props) {
  return (
    <article
      id={`response-${responseId}`}
      className={
        "rounded-2xl border bg-background p-4 scroll-mt-20 " +
        (featuredAt
          ? "border-accent/60 ring-1 ring-accent/30"
          : "border-border/60")
      }
    >
      {featuredAt && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-accent/10 px-3 py-2">
          <i className="ri-mail-star-line text-accent text-lg shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-bold text-accent">今週のお便りに採用</p>
            {featuredNote && (
              <p className="mt-0.5 text-xs leading-6 text-foreground/70">
                {featuredNote}
              </p>
            )}
          </div>
        </div>
      )}

      <Header
        nickname={nickname}
        prefecture={prefecture}
        avatarUrl={avatarUrl}
        createdAt={createdAt}
        isOperator={isOperator}
        isFoundingMember={isFoundingMember}
      />

      <div className="mt-2.5 text-base leading-8 text-foreground">
        <RichText text={body} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ReactionRow
          targetId={responseId}
          counts={reactionCounts}
          myReaction={myReaction}
          returnPath={returnPath}
        />
        {isMine && (
          <form action={deleteOwnResponse}>
            <input type="hidden" name="response_id" value={responseId} />
            <input type="hidden" name="return_path" value={returnPath} />
            <button
              type="submit"
              className="text-xs text-foreground/50 hover:text-notification underline-offset-2 hover:underline"
            >
              消す
            </button>
          </form>
        )}
      </div>

      {replies.length > 0 && (
        <ul className="mt-3 space-y-2 border-l-2 border-border/60 pl-3 sm:pl-4">
          {replies.map((r) => (
            <li
              key={r.id}
              id={`response-${r.id}`}
              className={
                "rounded-xl px-3 py-2.5 scroll-mt-20 " +
                (r.isOperator ? "bg-primary/5" : "bg-muted/40")
              }
            >
              <Header
                nickname={r.nickname}
                prefecture={r.prefecture}
                avatarUrl={r.avatarUrl}
                createdAt={r.createdAt}
                isOperator={r.isOperator}
                isFoundingMember={r.isFoundingMember}
                small
              />
              <div className="mt-1.5 text-base leading-8">
                <RichText text={r.body} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <ReactionRow
                  targetId={r.id}
                  counts={r.reactionCounts}
                  myReaction={r.myReaction}
                  returnPath={returnPath}
                />
                {r.isMine && (
                  <form action={deleteOwnResponse}>
                    <input type="hidden" name="response_id" value={r.id} />
                    <input type="hidden" name="return_path" value={returnPath} />
                    <button
                      type="submit"
                      className="text-xs text-foreground/50 hover:text-notification"
                    >
                      消す
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 返信欄は常に開けておく。「返信」を押させる一手間で会話が止まる */}
      <form
        action={postTopicResponse}
        className="mt-3 flex flex-col sm:flex-row gap-2"
      >
        <input type="hidden" name="topic_id" value={topicId} />
        <input type="hidden" name="parent_response_id" value={responseId} />
        <input type="hidden" name="return_path" value={returnPath} />
        <input
          type="text"
          name="body"
          maxLength={1000}
          placeholder={`${nickname}さんに一言`}
          className="flex-1 min-h-[var(--spacing-tap)] rounded-lg border border-border bg-page px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-5 rounded-full border border-border text-sm font-medium hover:bg-muted"
        >
          {loggedIn ? "返す" : "返してみる"}
        </button>
      </form>
    </article>
  );
}

function Header({
  nickname,
  prefecture,
  avatarUrl,
  createdAt,
  isOperator,
  isFoundingMember,
  small = false,
}: {
  nickname: string;
  prefecture: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isOperator: boolean;
  isFoundingMember: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <UserAvatar name={nickname} avatarUrl={avatarUrl} size={small ? 28 : 36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={
              "font-bold truncate " + (small ? "text-sm" : "text-base")
            }
          >
            {nickname}
          </span>
          <MembershipBadge
            isOperator={isOperator}
            isFoundingMember={isFoundingMember}
          />
        </div>
        <p className="text-xs text-foreground/50">
          {prefecture && <span className="mr-1.5">{prefecture}</span>}
          <time dateTime={createdAt}>{formatJa(createdAt)}</time>
        </p>
      </div>
    </div>
  );
}

function formatJa(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.floor((now - d.getTime()) / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}日前`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
