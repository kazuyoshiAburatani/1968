import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body className="min-h-dvh flex flex-col">
        <SiteHeader />
        <main className="flex-1 w-full">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-background)]">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex flex-col leading-tight no-underline"
          aria-label="1968 トップへ"
        >
          <span className="text-2xl font-bold tracking-wider text-[color:var(--color-primary)]">
            1968
          </span>
          <span className="text-sm text-[color:var(--color-foreground)]/70">
            1968年生まれ限定コミュニティ
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-3 text-sm"
          >
            ログイン
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] text-sm font-medium hover:opacity-90 no-underline"
          >
            入会する
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40">
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-bold text-base mb-2">1968</p>
            <p className="text-[color:var(--color-foreground)]/80">
              1968年生まれ限定コミュニティ
            </p>
          </div>
          <div>
            <p className="font-bold mb-2">案内</p>
            <ul className="space-y-1">
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
            <p className="mt-2 text-[color:var(--color-foreground)]/70">
              運営、油谷和好
            </p>
          </div>
        </div>
        <p className="mt-8 text-xs text-[color:var(--color-foreground)]/60">
          © 1968
        </p>
      </div>
    </footer>
  );
}
