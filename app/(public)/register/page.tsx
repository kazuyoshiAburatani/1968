import Link from "next/link";
import type { Metadata } from "next";
import { registerWithPassword } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "新規登録",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

function describeError(code: string): string {
  if (code === "terms") return "利用規約への同意が必要です。";
  if (code === "invalid_email") return "メールアドレスの形式をご確認ください。";
  if (code === "short_password")
    return "パスワードは 8 文字以上でお願いします。";
  if (code === "already_registered")
    return "このメールアドレスは既に登録されています。ログインからお進みください。";
  if (code === "google") return "Google ログインに失敗しました、再度お試しください。";
  if (code === "throttled")
    return "短時間に何度か試みたため、しばらくしてから再度お試しください。";
  return "登録に失敗しました、時間をおいて再度お試しください。";
}

export default async function RegisterPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-20">
      <h1 className="text-2xl font-bold">新規登録</h1>
      <p className="mt-2 text-foreground/80">
        1968 年（昭和43年）生まれの方のみご登録いただけます。
      </p>

      {sent && (
        <div className="mt-6 rounded-lg border border-primary/40 bg-muted/40 p-4">
          <p className="font-bold">確認メールをお送りしました。</p>
          <p className="mt-1 text-sm">
            メール内のリンクをクリックすると登録が完了します。リンクは1時間有効です。
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {describeError(error)}
        </div>
      )}

      {/* Google で登録、Server Action ではなく Route Handler 経由で PKCE cookie を確実にヘッダに乗せる */}
      <div className="mt-8">
        <a
          href="/auth/google"
          className="inline-flex items-center justify-center gap-2 min-h-[var(--spacing-tap)] px-6 rounded-full font-medium transition-opacity w-full border border-border text-foreground/80 hover:bg-muted no-underline"
        >
          <span className="inline-flex items-center gap-2">
            <GoogleIcon />
            Google で登録
          </span>
        </a>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-foreground/60">または</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* メール＋パスワード */}
      <form action={registerWithPassword} className="space-y-4">
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
            minLength={8}
            autoComplete="new-password"
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
            placeholder="8 文字以上"
          />
          <span className="mt-1 block text-xs text-foreground/60">
            英数字を混ぜた 8 文字以上でお願いします
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-1 size-5"
          />
          <span>
            <Link href="/terms">利用規約</Link>および{" "}
            <Link href="/privacy">プライバシーポリシー</Link>に同意します。
          </span>
        </label>

        <SubmitButton className="w-full" pendingText="登録中…">
          アカウントを登録する
        </SubmitButton>
      </form>

      <p className="mt-8 text-sm text-center">
        既にアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium">
          ログイン
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
