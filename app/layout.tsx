import type { Metadata } from "next";
import { Noto_Sans_JP, Pacifico } from "next/font/google";
import Link from "next/link";

// 全ページの Server Functions を東京リージョン（hnd1）で実行する。
// Supabase は ap-northeast-2（ソウル）にあり、US 経由だと往復で 200〜400ms かかっていたが、
// 東京にすれば 30〜80ms に短縮できる、各ページで 5〜15 クエリ走るので体感が劇的に変わる。
export const preferredRegion = ["hnd1"];
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";
import { Suspense } from "react";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { MembershipBadge } from "@/components/membership-badge";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NavProgress } from "@/components/nav-progress";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";
import "./globals.css";

// 和文UIの可読性重視、weight は 400/500/700 を使用
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// ロゴ「1968.LOVE」の装飾用、header やフッターだけで使う
const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "1968.LOVE | 1968年前後に生まれた学年の、語らいの場",
    template: "%s | 1968.LOVE",
  },
  description:
    "1968年に生まれた学年（昭和43年度）を中心に、そのひとつ上とひとつ下の学年までが集まる語らいの場。今日の二択、穴埋めのお題、自分の年表、昭和43年度生まれ検定。読むだけなら登録は要りません。",
  applicationName: "1968.LOVE",
  authors: [{ name: "油谷和好", url: "https://1968.love" }],
  creator: "油谷和好",
  publisher: "1968.LOVE",
  keywords: [
    "1968年生まれ",
    "1967年生まれ",
    "1969年生まれ",
    "昭和43年生まれ",
    "昭和42年度生まれ",
    "昭和43年度生まれ",
    "昭和44年度生まれ",
    "昭和レトロ",
    "同年代コミュニティ",
    "50代",
    "シニアSNS",
    "1968.LOVE",
  ],
  metadataBase: new URL("https://1968.love"),
  alternates: { canonical: "https://1968.love" },
  // ファビコン・アイコン群、Next.js 16 の Metadata API 経由で head に注入
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/logo/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "1968.LOVE | 1968年前後に生まれた学年の、語らいの場",
    description:
      "同じ校舎で同じテレビの話をしていた学年だけで話しています。完全無料。ニックネームと生まれた日だけ、30秒で参加できます。",
    url: "https://1968.love",
    siteName: "1968.LOVE",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/og/og-tagline.png",
        width: 1200,
        height: 630,
        alt: "1968.LOVE | 1968年前後に生まれた学年の、語らいの場",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "1968.LOVE | 1968年前後に生まれた学年の、語らいの場",
    description:
      "1968年に生まれた学年と、その上下ひとつずつの語らいの場。今日の二択に、指一本でどうぞ。",
    images: ["/og/og-tagline.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Google Search Console / Bing Webmaster の所有権確認、env で配るだけ反映
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "msvalidate.01":
        process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "",
    },
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

  let nickname: string | null = null;
  let avatarUrl: string | null = null;
  let isAdmin = false;
  let isFoundingMember = false;
  let unreadCount = 0;

  if (userId) {
    const { data } = await supabase
      .rpc("get_session_header_context", { p_user_id: userId })
      .maybeSingle<{
        membership_rank: string;
        nickname: string | null;
        avatar_url: string | null;
        is_admin: boolean;
        is_founding_member: boolean;
        school_year: number | null;
        unread_count: number;
      }>();
    nickname = data?.nickname ?? null;
    avatarUrl = publicAvatarUrl(data?.avatar_url ?? null);
    isAdmin = data?.is_admin === true;
    isFoundingMember = data?.is_founding_member === true;
    unreadCount = Number(data?.unread_count ?? 0);
  }

  return (
    <html lang="ja" className={`${notoSansJp.variable} ${pacifico.variable}`}>
      <head>
        {/* Remixicon、ダッシュボード等で使う軽量アイコンフォント */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.min.css"
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        {/* JSON-LD 構造化データ、AEO・SEO 用 */}
        {/* Organization と WebSite を root layout に置くことで全ページに継承させる */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://1968.love/#organization",
                  name: "1968.LOVE",
                  alternateName: [
                    "イチキュウロクハチドットラブ",
                    "昭和43年度生まれの語らいの場",
                    "1968年前後に生まれた学年の語らいの場",
                  ],
                  url: "https://1968.love",
                  logo: "https://1968.love/logo/icon-512.png",
                  founder: {
                    "@type": "Person",
                    name: "油谷和好",
                  },
                  email: "support@1968.love",
                  description:
                    "1968年に生まれた学年（昭和43年度生まれ）を中心に、ひとつ上の昭和42年度とひとつ下の昭和44年度までが参加できる、同世代のオンラインの集まり。",
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: "南船場3丁目2番22号おおきに南船場ビル205",
                    addressLocality: "大阪市中央区",
                    addressRegion: "大阪府",
                    postalCode: "542-0081",
                    addressCountry: "JP",
                  },
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    email: "support@1968.love",
                    areaServed: "JP",
                    availableLanguage: ["Japanese"],
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": "https://1968.love/#website",
                  url: "https://1968.love",
                  name: "1968.LOVE",
                  alternateName: "イチキュウロクハチドットラブ",
                  description:
                    "1968年に生まれた学年と、その上下ひとつずつの語らいの場。",
                  publisher: { "@id": "https://1968.love/#organization" },
                  inLanguage: "ja-JP",
                },
              ],
            }),
          }}
        />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <SiteHeader
          userId={userId}
          nickname={nickname}
          avatarUrl={avatarUrl}
          isAdmin={isAdmin}
          isFoundingMember={isFoundingMember}
        />
        {/* モバイル時はタブバー分の下部余白を確保 */}
        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
        <SiteFooter />
        <MobileTabBar unreadCount={unreadCount} loggedIn={!!userId} />
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}

function SiteHeader({
  userId,
  nickname,
  avatarUrl,
  isAdmin,
  isFoundingMember,
}: {
  userId: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isFoundingMember: boolean;
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center no-underline shrink-0"
          aria-label="1968.LOVE、1968年前後に生まれた学年の語らいの場、トップへ"
        >
          {/* デスクトップではフルロゴ（1968 + サブタイトル）、モバイルではアイコンのみ */}
          <Image
            src="/logo/wordmark.png"
            alt="1968.LOVE 1968年前後に生まれた学年の、語らいの場"
            width={209}
            height={144}
            priority
            className="hidden sm:block h-12 w-auto"
          />
          <Image
            src="/logo/wordmark-compact.png"
            alt="1968.LOVE"
            width={157}
            height={108}
            priority
            className="block sm:hidden h-9 w-auto"
          />
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
          {/* 掲示板 12 カテゴリはアーカイブ扱いに、ホームは「お題フィード」主導。
              ヘッダーからの直接導線は外し、ホームサイドバーからのみ辿れるようにする。 */}
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
              <MembershipBadge isFoundingMember={isFoundingMember} />
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
                href="/join"
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90 no-underline"
              >
                席をつくる
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
            <p className="font-bold text-base mb-2">1968.LOVE</p>
            <p className="text-foreground/80">
              1968年に生まれた学年と、その上下ひとつずつ
            </p>
          </div>
          <div>
            <p className="font-bold mb-2">案内</p>
            <ul className="space-y-1">
              <li>
                <Link href="/stories">あの店・あの商品、今どうなってる？</Link>
              </li>
              <li>
                <Link href="/polls">これまでの二択</Link>
              </li>
              <li>
                <Link href="/topics">これまでのお題</Link>
              </li>
              <li>
                <Link href="/nenpyo">あなたの1968年表</Link>
              </li>
              <li>
                <Link href="/kentei">昭和43年度生まれ検定</Link>
              </li>
              <li>
                <Link href="/today">今日は何の日</Link>
              </li>
              <li>
                <Link href="/letters">お便り紹介</Link>
              </li>
              <li>
                <Link href="/timeline">みんなの新着</Link>
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
