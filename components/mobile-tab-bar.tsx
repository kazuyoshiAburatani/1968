"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// モバイル（< md）でのみ画面下部に表示する LINE 風のタブナビ。
// シニア向けに 1 タブあたり最低 64px の高さ、アイコン＋日本語ラベル。
// タップターゲットは Apple HIG / Google Material 推奨の 44px 以上を確保。

type Item = {
  href: string;
  icon: string; // remixicon class（例 "ri-home-5-line"）
  iconActive: string;
  label: string;
  matchPrefix?: string; // 配下パスもアクティブ扱い（例 /board と /board/xxx）
};

const ITEMS: Item[] = [
  {
    href: "/",
    icon: "ri-home-5-line",
    iconActive: "ri-home-5-fill",
    label: "ホーム",
  },
  {
    href: "/board",
    icon: "ri-chat-3-line",
    iconActive: "ri-chat-3-fill",
    label: "ひろば",
    matchPrefix: "/board",
  },
  {
    href: "/messages",
    icon: "ri-mail-line",
    iconActive: "ri-mail-fill",
    label: "トーク",
    matchPrefix: "/messages",
  },
  {
    href: "/notifications",
    icon: "ri-notification-3-line",
    iconActive: "ri-notification-3-fill",
    label: "お知らせ",
    matchPrefix: "/notifications",
  },
  {
    href: "/mypage",
    icon: "ri-user-3-line",
    iconActive: "ri-user-3-fill",
    label: "マイ",
    matchPrefix: "/mypage",
  },
];

// このパスではタブバーを非表示にする（フォーム集中、認証画面、LP など）
const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/onboarding",
  "/auth",
  "/beta",
];

export function MobileTabBar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname() ?? "/";

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  const isActive = (item: Item) => {
    if (item.matchPrefix) {
      return pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/");
    }
    return pathname === item.href;
  };

  return (
    <nav
      aria-label="メインナビゲーション"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item);
          const showBadge =
            item.href === "/notifications" && unreadCount > 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 min-h-[64px] px-1 py-1.5 no-underline transition-colors active:bg-muted/60 relative",
                  active
                    ? "text-primary"
                    : "text-foreground/60 hover:text-foreground",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative inline-flex">
                  <i
                    className={`text-2xl leading-none ${active ? item.iconActive : item.icon}`}
                    aria-hidden
                  />
                  {showBadge && (
                    <span
                      aria-label={`未読 ${unreadCount} 件`}
                      className="absolute -top-1 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-medium leading-tight">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
