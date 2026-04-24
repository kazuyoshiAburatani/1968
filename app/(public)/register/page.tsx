import Link from "next/link";
import type { Metadata } from "next";
import { requestRegisterLink } from "./actions";

export const metadata: Metadata = {
  title: "新規登録",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-20">
      <h1 className="text-2xl font-bold">新規登録</h1>
      <p className="mt-2 text-[color:var(--color-foreground)]/80">
        1968年（昭和43年）生まれの方のみご登録いただけます。
        メールアドレスをご入力いただくと、ご登録用のリンクをお送りします。
      </p>

      {sent && (
        <div className="mt-6 rounded-lg border border-[color:var(--color-primary)]/40 bg-[color:var(--color-muted)]/40 p-4">
          <p className="font-bold">メールをお送りしました。</p>
          <p className="mt-1 text-sm">
            数分以内にリンク付きのメールが届きます。リンクをクリックして登録を続けてください。
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {error === "terms" && "利用規約への同意が必要です。"}
          {error === "invalid_email" && "メールアドレスの形式をご確認ください。"}
          {error === "throttled" &&
            "短時間に送信を繰り返したため一時的にお待ちください。1分ほど時間を空けて再度お試しください。"}
          {error === "unexpected" && "登録メールの送信に失敗しました。時間をおいて再度お試しください。"}
        </div>
      )}

      <form action={requestRegisterLink} className="mt-6 space-y-4">
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

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-1 size-5"
          />
          <span>
            <Link href="/terms">利用規約</Link>および{" "}
            <Link href="/privacy">プライバシーポリシー</Link>
            に同意します。
          </span>
        </label>

        <button
          type="submit"
          className="w-full min-h-[var(--spacing-tap)] px-4 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] font-medium hover:opacity-90"
        >
          登録メールを送る
        </button>
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
