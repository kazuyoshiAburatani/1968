import Link from "next/link";
import type { Metadata } from "next";
import {
  requestLoginLink,
  signInWithPasswordAction,
  startGoogleOAuth,
} from "./actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "ログイン",
};

function describeLoginError(code: string): string {
  if (code === "invalid_credentials")
    return "メールアドレスとパスワードをご確認ください。";
  if (code === "not_confirmed")
    return "確認メールがまだ完了していません。登録時に届いたメールのリンクをクリックしてください。";
  if (code === "throttled")
    return "短時間に送信を繰り返したため、1 分ほどお待ちください。";
  if (code === "missing_code")
    return "ログインリンクが不完全でした。メールを再度確認してください。";
  if (code === "no_session")
    return "セッションを確立できませんでした。再度お試しください。";
  if (code === "otp_expired")
    return "ログインリンクの有効期限が切れています。もう一度お送りします。";
  if (code === "access_denied")
    return "ログインリンクが無効です。新しくログインリンクを取得してください。";
  if (code === "google")
    return "Google ログインに失敗しました、再度お試しください。";
  if (code.startsWith("exchange_"))
    return "認証の照合に失敗しました、最新のメールからリンクをクリックしてください。";
  return `エラーが発生しました（${code}）、もう一度お試しください。`;
}

type Props = {
  searchParams: Promise<{
    sent?: string;
    error?: string;
    method?: string; // method=magic でマジックリンクフォームに切替
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { sent, error, method } = await searchParams;
  const useMagic = method === "magic";

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-20">
      <h1 className="text-2xl font-bold">ログイン</h1>

      {sent && (
        <div className="mt-6 rounded-lg border border-primary/40 bg-muted/40 p-4">
          <p className="font-bold">メールをお送りしました。</p>
          <p className="mt-1 text-sm">
            メール内のリンクをクリックするとログインが完了します。
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm space-y-1">
          <p className="font-bold">ログインに失敗しました。</p>
          <p>{describeLoginError(error)}</p>
        </div>
      )}

      {/* Google */}
      <form action={startGoogleOAuth} className="mt-8">
        <SubmitButton
          variant="outline"
          className="w-full"
          pendingText="Google に移動中…"
        >
          <span className="inline-flex items-center gap-2">
            <GoogleIcon />
            Google でログイン
          </span>
        </SubmitButton>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-foreground/60">または</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* パスワード / マジックリンク切替 */}
      {useMagic ? (
        <>
          <form action={requestLoginLink} className="space-y-4">
            <label className="block">
              <span className="block font-medium mb-2">メールアドレス</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
                placeholder="your@example.com"
              />
            </label>
            <SubmitButton className="w-full" pendingText="送信中…">
              ログインリンクを送る
            </SubmitButton>
          </form>
          <p className="mt-4 text-sm text-center">
            <Link href="/login" className="font-medium">
              ← パスワードでログイン
            </Link>
          </p>
        </>
      ) : (
        <>
          <form action={signInWithPasswordAction} className="space-y-4">
            <label className="block">
              <span className="block font-medium mb-2">メールアドレス</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
                placeholder="your@example.com"
              />
            </label>
            <label className="block">
              <span className="block font-medium mb-2">パスワード</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
                placeholder="パスワード"
              />
            </label>
            <SubmitButton className="w-full" pendingText="ログイン中…">
              ログイン
            </SubmitButton>
          </form>
          <p className="mt-4 text-sm text-center">
            <Link href="/login?method=magic" className="font-medium">
              パスワードを使わずメールでログイン
            </Link>
          </p>
        </>
      )}

      <p className="mt-8 text-sm text-center">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="font-medium">
          新規登録
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M21.35 11.1h-9.17v2.92h5.26c-.45 2.18-2.34 3.44-5.26 3.44-3.21 0-5.82-2.6-5.82-5.82s2.6-5.82 5.82-5.82c1.42 0 2.72.52 3.73 1.45l2.09-2.09C16.65 3.47 14.51 2.5 12.18 2.5c-5.25 0-9.5 4.25-9.5 9.5s4.25 9.5 9.5 9.5c4.76 0 8.82-3.46 8.82-9.5 0-.57-.06-1.13-.16-1.67z"
        fill="#4285F4"
      />
      <path
        d="M3.88 7.28l2.8 2.06c.76-1.83 2.55-3.12 4.64-3.12 1.42 0 2.72.52 3.73 1.45l2.09-2.09C15.49 3.92 13.63 3 11.32 3c-3.34 0-6.24 1.89-7.44 4.28z"
        fill="#EA4335"
      />
      <path
        d="M12.18 21.5c2.28 0 4.3-.73 5.84-2.22l-2.7-2.03c-.89.68-2.02 1.07-3.14 1.07-2.9 0-5.36-1.95-6.24-4.52l-2.82 2.17C4.24 19.04 7.83 21.5 12.18 21.5z"
        fill="#34A853"
      />
      <path
        d="M18.77 14.35c-.38 1.13-1.2 2.05-2.25 2.65-.02.01-.04.02-.06.04l2.69 2.03c-.19.19.02-.01 0 0 2-1.84 3.2-4.37 3.2-7.47 0-.57-.06-1.13-.16-1.67h-9.17v2.92h5.26c-.23 1.13-.79 2.08-1.51 2.5z"
        fill="#FBBC05"
      />
    </svg>
  );
}
