import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "トーク",
};

export default async function MessagesIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">トーク</h1>
      <p className="mt-3 text-sm text-foreground/70">
        正会員どうしのダイレクトメッセージ機能を準備中です。
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <i className="ri-mail-line text-3xl text-primary leading-none" aria-hidden />
          <div>
            <p className="font-bold">トーク機能、まもなく公開</p>
            <p className="mt-2 text-sm text-foreground/80 leading-7">
              同年代どうし、本音で語り合える1対1のトーク機能を開発中です。
              お互いに気持ちよくお使いいただけるよう、運営側でも仕様を調整しています。
              公開時にはお知らせします。
            </p>
            <p className="mt-3 text-xs text-foreground/60">
              ※ ダイレクトメッセージは、本人と運営の三者が閲覧できる仕様です。健全な運営のため、内容を確認させていただく場合があります。詳しくは
              <Link href="/terms" className="underline">利用規約</Link>
              第13条をご覧ください。
            </p>
          </div>
        </div>
      </div>

      {!user && (
        <div className="mt-8 rounded-lg border border-border bg-background p-5 text-sm">
          <p>トーク機能のご利用には、会員登録が必要です。</p>
          <p className="mt-3">
            <Link
              href="/register"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white no-underline font-medium"
            >
              会員登録（無料）
            </Link>
          </p>
        </div>
      )}

      <p className="mt-10 text-sm">
        <Link href="/board">→ 掲示板で語らいに参加する</Link>
      </p>
    </div>
  );
}
