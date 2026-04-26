import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { default: "管理画面", template: "%s ・ 管理画面" },
};

const NAV: Array<{ href: string; label: string; icon: string }> = [
  { href: "/admin/dashboard", label: "ダッシュボード", icon: "ri-dashboard-line" },
  { href: "/admin/applications", label: "ベータ応募", icon: "ri-mail-open-line" },
  { href: "/admin/verifications", label: "身分証審査", icon: "ri-shield-check-line" },
  { href: "/admin/reports", label: "違反報告", icon: "ri-alarm-warning-line" },
  { href: "/admin/users", label: "会員管理", icon: "ri-group-line" },
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
