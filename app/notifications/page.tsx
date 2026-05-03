import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchNotifications, isUnread } from "@/lib/notifications";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationsMarkSeen } from "@/components/notifications-mark-seen";

export const metadata: Metadata = {
  title: "お知らせ",
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
        <p className="mt-3 text-sm text-foreground/70">
          お知らせの確認には、会員登録とログインが必要です。
        </p>
        <p className="mt-6">
          <Link
            href="/register"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white no-underline font-medium"
          >
            会員登録（無料）
          </Link>
        </p>
      </div>
    );
  }

  const { items, lastSeenAt } = await fetchNotifications(supabase, user.id, {
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-6 sm:py-10">
      <NotificationsMarkSeen />
      <header className="px-4 sm:px-0 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">お知らせ</h1>
        <span className="text-xs text-foreground/60">{items.length} 件</span>
      </header>

      {items.length === 0 ? (
        <EmptyState
          variant="notifications"
          title="まだお知らせはありません"
          description="返信、いいね、ダイレクトメッセージが届くと、こちらに表示されます。"
        />
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border bg-background sm:rounded-xl sm:border">
          {items.map((it, idx) => {
            const unread = isUnread(it, lastSeenAt);
            return (
              <li key={`${it.kind}-${idx}`}>
                <NotificationRow
                  item={it}
                  unread={unread}
                  formatRelative={formatRelative}
                />
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 px-4 text-xs text-foreground/60 text-center">
        過去 50 件まで表示しています。
      </p>
    </div>
  );
}

import type { Notification } from "@/lib/notifications";

function NotificationRow({
  item,
  unread,
  formatRelative,
}: {
  item: Notification;
  unread: boolean;
  formatRelative: (iso: string) => string;
}) {
  if (item.kind === "reply_to_thread") {
    const href = `/board/${item.categorySlug}/${item.threadId}#reply-${item.replyId}`;
    return (
      <Row
        href={href}
        unread={unread}
        avatar={
          <UserAvatar
            name={item.actorName}
            avatarUrl={item.actorAvatar}
            isAi={item.actorIsAi}
            size={44}
          />
        }
        title={
          <>
            <strong>{item.actorName}</strong> さんがあなたのスレッドに返信しました
          </>
        }
        meta={`「${item.threadTitle}」`}
        body={item.bodyExcerpt}
        time={formatRelative(item.createdAt)}
        icon="ri-reply-line"
        actorIsAi={item.actorIsAi}
      />
    );
  }

  if (item.kind === "like_on_thread") {
    const href = `/board/${item.categorySlug}/${item.threadId}`;
    return (
      <Row
        href={href}
        unread={unread}
        avatar={
          <UserAvatar
            name={item.actorName}
            avatarUrl={item.actorAvatar}
            isAi={item.actorIsAi}
            size={44}
          />
        }
        title={
          <>
            <strong>{item.actorName}</strong> さんがあなたのスレッドにいいねしました
          </>
        }
        meta={`「${item.threadTitle}」`}
        time={formatRelative(item.createdAt)}
        icon="ri-heart-fill"
        iconColor="text-rose-600"
        actorIsAi={item.actorIsAi}
      />
    );
  }

  if (item.kind === "like_on_reply") {
    const href = `/board/${item.categorySlug}/${item.threadId}#reply-${item.replyId}`;
    return (
      <Row
        href={href}
        unread={unread}
        avatar={
          <UserAvatar
            name={item.actorName}
            avatarUrl={item.actorAvatar}
            isAi={item.actorIsAi}
            size={44}
          />
        }
        title={
          <>
            <strong>{item.actorName}</strong> さんがあなたの返信にいいねしました
          </>
        }
        meta={`「${item.threadTitle}」内の返信`}
        time={formatRelative(item.createdAt)}
        icon="ri-heart-fill"
        iconColor="text-rose-600"
        actorIsAi={item.actorIsAi}
      />
    );
  }

  // dm_received
  const href = `/messages/${item.peerId}`;
  return (
    <Row
      href={href}
      unread={unread}
      avatar={
        <UserAvatar
          name={item.peerName}
          avatarUrl={item.peerAvatar}
          isAi={item.peerIsAi}
          size={44}
        />
      }
      title={
        <>
          <strong>{item.peerName}</strong> さんから新しいメッセージ
        </>
      }
      body={item.bodyExcerpt}
      time={formatRelative(item.createdAt)}
      icon="ri-mail-line"
      iconColor="text-primary"
      actorIsAi={item.peerIsAi}
    />
  );
}

function Row({
  href,
  unread,
  avatar,
  title,
  meta,
  body,
  time,
  icon,
  iconColor,
  actorIsAi,
}: {
  href: string;
  unread: boolean;
  avatar: React.ReactNode;
  title: React.ReactNode;
  meta?: string;
  body?: string;
  time: string;
  icon: string;
  iconColor?: string;
  actorIsAi: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 px-4 py-3.5 no-underline hover:bg-muted/40 active:bg-muted/70 transition-colors ${
        unread ? "bg-primary/5" : ""
      }`}
    >
      <div className="relative shrink-0">
        {avatar}
        <span
          className={`absolute -bottom-1 -right-1 inline-flex items-center justify-center size-5 rounded-full bg-background border border-border shadow-sm ${iconColor ?? "text-foreground/70"}`}
        >
          <i className={`${icon} text-xs`} aria-hidden />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-foreground line-clamp-1 flex-1">
            {title}
            {actorIsAi && (
              <span className="ml-1.5 align-middle inline-block px-1 py-px rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                運営AI
              </span>
            )}
          </p>
          <span className="text-xs text-foreground/60 shrink-0">{time}</span>
        </div>
        {meta && (
          <p className="mt-0.5 text-xs text-foreground/70 truncate">{meta}</p>
        )}
        {body && (
          <p className="mt-0.5 text-sm text-foreground/70 line-clamp-1">
            {body}
          </p>
        )}
      </div>
      {unread && (
        <span
          aria-label="未読"
          className="shrink-0 size-2 rounded-full bg-primary mt-2"
        />
      )}
    </Link>
  );
}
