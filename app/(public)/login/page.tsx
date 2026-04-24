import Link from "next/link";
import type { Metadata } from "next";
import { requestLoginLink } from "./actions";

function describeLoginError(code: string): string {
  if (code === "invalid") return "メールアドレスの形式をご確認ください。";
  if (code === "missing_code") return "ログインリンクが不完全でした。メールを再度確認してください。";
  if (code === "no_session") return "セッションを確立できませんでした。再度お試しください。";
  if (code === "otp_expired") return "ログインリンクの有効期限が切れています。もう一度お送りします。";
  if (code === "access_denied") return "ログインリンクが無効です。新しくログインリンクを取得してください。";
  if (code.startsWith("exchange_")) return "認証の照合に失敗しました。最新のメールからリンクをクリックしてください。";
  return `エラーが発生しました（${code}）。もう一度お試しください。`;
}

export const metadata: Metadata = {
  title: "ログイン",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-20">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <p className="mt-2 text-[color:var(--color-foreground)]/80">
        ご登録のメールアドレス宛に、ログイン用のリンクをお送りします。
        メール内のリンクをクリックするとログインが完了します。
      </p>

      {sent && (
        <div className="mt-6 rounded-lg border border-[color:var(--color-primary)]/40 bg-[color:var(--color-muted)]/40 p-4">
          <p className="font-bold">メールをお送りしました。</p>
          <p className="mt-1 text-sm">
            数分以内にリンク付きのメールが届きます。メールが見当たらない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm space-y-1">
          <p className="font-bold">ログインに失敗しました。</p>
          <p>{describeLoginError(error)}</p>
        </div>
      )}

      <form action={requestLoginLink} className="mt-6 space-y-4">
        <label className="block">
          <span className="block font-medium mb-2">メールアドレス</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
            placeholder="your@example.com"
          />
        </label>
        <button
          type="submit"
          className="w-full min-h-[var(--spacing-tap)] px-4 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] font-medium hover:opacity-90"
        >
          ログインリンクを送る
        </button>
      </form>

      <p className="mt-8 text-sm text-center">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="font-medium">
          新規登録
        </Link>
      </p>
    </div>
  );
}
