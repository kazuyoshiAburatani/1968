import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Link from "next/link";

// 全ページの Server Functions を東京リージョン（hnd1）で実行する。
// Supabase は ap-northeast-2（ソウル）にあり、US 経由だと往復で 200〜400ms かかっていたが、
// 東京にすれば 30〜80ms に短縮できる、各ページで 5〜15 クエリ走るので体感が劇的に変わる。
export const preferredRegion = ["hnd1"];
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { MembershipBadge } from "@/components/membership-badge";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NavProgress } from "@/components/nav-progress";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";
import type { Rank } from "@/lib/auth/permissions";
import "./globals.css";

// 和文UIの可読性重視、weight は 400/500/700 を使用
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "1968 | 1968年生まれ限定コミュニティ",
    template: "%s | 1968",
  },
  description:
    "1968年（昭和43年）生まれだけが参加できる、同い年の会員制コミュニティ。介護・夫婦・健康・お金など、人には聞きにくい話題を本音で語り合える場。",
  metadataBase: new URL("https://1968.love"),
  openGraph: {
    title: "1968 | 1968年生まれ限定コミュニティ",
    description:
      "同い年だけが集まる安心感と希少性を軸に、本音で話せる会員制コミュニティ。",
    url: "https://1968.love",
    siteName: "1968",
    locale: "ja_JP",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 全ページのヘッダーにログイン状態を反映させるため、layout で認証情報を取得する。
  // 未ログイン時でも Supabase への軽い問い合わせが入るが、proxy.ts のセッションリフレッシュと
  // 同じ getUser を共有するため重複は最小限。
  const supabase = await createSupabaseServerClient();
  // auth.getUser だけ先に実行（セッションリフレッシュも兼ねる）。
  // userId が取れたら、レイアウトに必要な情報を 1 RPC でまとめて取得する。
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const userId = authUser?.id ?? null;

  let rank: Rank = "guest";
  let nickname: string | null = null;
  let avatarUrl: string | null = null;
  let isAdmin = false;
  let unreadCount = 0;

  if (userId) {
    const { data } = await supabase
      .rpc("get_session_header_context", { p_user_id: userId })
      .maybeSingle<{
        membership_rank: string;
        nickname: string | null;
        avatar_url: string | null;
        is_admin: boolean;
        unread_count: number;
      }>();
    rank = ((data?.membership_rank as Rank | undefined) ?? "member") as Rank;
    nickname = data?.nickname ?? null;
    avatarUrl = publicAvatarUrl(data?.avatar_url ?? null);
    isAdmin = data?.is_admin === true;
    unreadCount = Number(data?.unread_count ?? 0);
  }

  return (
    <html lang="ja" className={notoSansJp.variable}>
      <head>
        {/* Remixicon、ダッシュボード等で使う軽量アイコンフォント */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.min.css"
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <SiteHeader
          rank={rank}
          userId={userId}
          nickname={nickname}
          avatarUrl={avatarUrl}
          isAdmin={isAdmin}
        />
        {/* モバイル時はタブバー分の下部余白を確保 */}
        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
        <SiteFooter />
        <MobileTabBar unreadCount={unreadCount} />
      </body>
    </html>
  );
}

function SiteHeader({
  rank,
  userId,
  nickname,
  avatarUrl,
  isAdmin,
}: {
  rank: Rank;
  userId: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex flex-col leading-tight no-underline shrink-0"
          aria-label="1968 トップへ"
        >
          <span className="text-2xl font-bold tracking-wider text-primary">
            1968
          </span>
          <span className="text-sm text-foreground/70 hidden sm:block">
            1968年生まれ限定コミュニティ
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-3 rounded-full border border-amber-700 bg-amber-50 text-amber-900 no-underline text-sm font-medium"
              aria-label="管理画面へ"
            >
              管理
            </Link>
          )}
          <Link
            href="/board"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-3 rounded-full border border-border bg-background hover:bg-muted/40 no-underline text-sm font-medium text-foreground"
            aria-label="掲示板トップへ"
          >
            掲示板TOP
          </Link>
          {userId ? (
            <Link
              href="/mypage"
              className="inline-flex items-center gap-2 min-h-[var(--spacing-tap)] pl-1 pr-3 rounded-full border border-border bg-background hover:bg-muted/40 active:bg-muted/60 no-underline text-sm"
              aria-label="マイページへ"
            >
              <UserAvatar
                name={nickname ?? "ユーザー"}
                avatarUrl={avatarUrl}
                size={32}
              />
              <MembershipBadge rank={rank} />
              <span className="font-medium text-foreground max-w-[6rem] truncate hidden sm:inline">
                {nickname ?? "マイページ"}
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-3 text-sm"
              >
                ログイン
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90 no-underline"
              >
                入会する
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-bold text-base mb-2">1968</p>
            <p className="text-foreground/80">
              1968年生まれ限定コミュニティ
            </p>
          </div>
          <div>
            <p className="font-bold mb-2">案内</p>
            <ul className="space-y-1">
              <li>
                <Link href="/timeline">みんなの新着</Link>
              </li>
              <li>
                <Link href="/beta">ベータテスター募集中</Link>
              </li>
              <li>
                <Link href="/terms">利用規約</Link>
              </li>
              <li>
                <Link href="/privacy">プライバシーポリシー</Link>
              </li>
              <li>
                <Link href="/tokushoho">特定商取引法に基づく表示</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-bold mb-2">お問い合わせ</p>
            <p>
              <a href="mailto:support@1968.love">support@1968.love</a>
            </p>
            <p className="mt-2 text-foreground/70">
              運営、油谷和好
            </p>
          </div>
        </div>
        <p className="mt-8 text-xs text-foreground/60">
          © 1968
        </p>
      </div>
    </footer>
  );
}
