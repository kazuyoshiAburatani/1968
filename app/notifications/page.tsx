import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchNotifications, isUnread } from "@/lib/notifications";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationsMarkSeen } from "@/components/notifications-mark-seen";

export const metadata: Metadata = {
  title: "お知らせ",
};

function formatRelative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">お知らせ</h1>
        <p className="mt-3 text-base leading-8 text-foreground/70">
          お返事が届いたことをお知らせするには、席が必要です。
          <br />
          ニックネームと生まれた日だけ、30秒で終わります。
        </p>
        <p className="mt-6">
          <Link
            href="/join"
            className="inline-flex items-center min-h-[52px] px-6 rounded-full bg-primary text-white no-underline font-bold"
          >
            席をつくる
          </Link>
        </p>
      </div>
    );
  }

  const { items, lastSeenAt } = await fetchNotifications(supabase, user.id, {
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <NotificationsMarkSeen />
      <h1 className="text-2xl font-bold">お知らせ</h1>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/40 p-6">
          <p className="text-base leading-8 text-foreground/80">
            まだお知らせはありません。
            <br />
            お題に一言書くと、どなたかから返事が届きます。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-bold no-underline"
          >
            今週のお題を見る
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {items.map((n) => {
            const unread = isUnread(n, lastSeenAt);
            return (
              <li key={n.id}>
                <Link
                  href={`/topics/${n.topicId}#response-${n.responseId}`}
                  className={
                    "flex items-start gap-3 rounded-2xl border p-4 no-underline transition-colors " +
                    (unread
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-background hover:bg-muted/40")
                  }
                >
                  {n.kind === "reply" ? (
                    <UserAvatar
                      name={n.actorName}
                      avatarUrl={n.actorAvatarUrl}
                      size={40}
                    />
                  ) : (
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
                      <i
                        className={
                          n.kind === "featured"
                            ? "ri-mail-star-line text-accent text-lg"
                            : "ri-heart-3-line text-accent text-lg"
                        }
                        aria-hidden
                      />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-7 text-foreground">
                      {n.kind === "reply" && (
                        <>
                          <span className="font-bold">{n.actorName}</span>
                          {n.isOperator && (
                            <span className="ml-1 text-xs font-bold text-primary">
                              （運営）
                            </span>
                          )}
                          さんから返事が届きました
                        </>
                      )}
                      {n.kind === "featured" &&
                        "あなたの投稿が「今週のお便り」に選ばれました"}
                      {n.kind === "reaction" &&
                        `あなたの投稿に「${n.reactionLabel}」が付きました`}
                    </p>
                    <p className="mt-0.5 text-sm text-foreground/60 line-clamp-2">
                      {n.excerpt}
                    </p>
                    <p className="mt-1 text-xs text-foreground/40">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
