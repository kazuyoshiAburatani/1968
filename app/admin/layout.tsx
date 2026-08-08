import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { default: "管理画面", template: "%s ・ 管理画面" },
};

// 運営の一日は「返す」から始まる。
// 検証で定着の要になったのは、投稿に必ず返事が来ることだった。
// したがって未返信キューを一番上に置き、毎日ここを空にする運用を前提にする。
const NAV: Array<{ href: string; label: string; icon: string }> = [
  { href: "/admin/replies", label: "未返信", icon: "ri-reply-line" },
  { href: "/admin/dashboard", label: "ダッシュボード", icon: "ri-dashboard-line" },
  { href: "/admin/topics", label: "お題の配信", icon: "ri-chat-quote-line" },
  { href: "/admin/polls", label: "二択の配信", icon: "ri-scales-3-line" },
  { href: "/admin/letters", label: "お便り紹介", icon: "ri-mail-star-line" },
  { href: "/admin/media", label: "写真の見張り", icon: "ri-image-line" },
  { href: "/admin/reports", label: "違反報告", icon: "ri-alarm-warning-line" },
  { href: "/admin/users", label: "会員管理", icon: "ri-group-line" },
  { href: "/admin/applications", label: "創設メンバー招待", icon: "ri-mail-open-line" },
  { href: "/admin/audit-logs", label: "監査ログ", icon: "ri-history-line" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { admin } = await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8">
        <aside className="md:sticky md:top-4 md:self-start">
          <p className="text-xs text-foreground/60 mb-2">
            管理画面、{admin.role}
          </p>
          <nav>
            <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="flex items-center gap-2 px-3 py-2 rounded text-sm whitespace-nowrap hover:bg-muted no-underline text-foreground"
                  >
                    <i className={`${n.icon} text-base`} aria-hidden />
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-6 text-xs text-foreground/60 hidden md:block">
            <Link href="/" className="underline">
              ← サイトトップ
            </Link>
          </p>
        </aside>
        <main className="mt-6 md:mt-0 min-w-0">{children}</main>
      </div>
    </div>
  );
}
