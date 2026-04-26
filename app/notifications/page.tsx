import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "お知らせ",
};

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">お知らせ</h1>
      <p className="mt-3 text-sm text-foreground/70">
        運営からのお知らせと、自分の投稿への反応をまとめてご確認いただけます。
      </p>

      <section className="mt-8">
        <h2 className="font-bold">運営からのお知らせ</h2>
        <ul className="mt-4 space-y-3">
          <li className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-foreground/60">2026年4月25日</p>
            <p className="mt-1 font-medium">ベータテスター募集中、正会員プラン1年無料</p>
            <p className="mt-2 text-sm text-foreground/80 leading-7">
              正式公開に向けて、一緒にサービスを育てていただける同年代の方を募集しています。
            </p>
            <p className="mt-3 text-sm">
              <Link href="/beta" className="underline">
                募集ページを見る →
              </Link>
            </p>
          </li>
          <li className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-foreground/60">2026年4月24日</p>
            <p className="mt-1 font-medium">運営AIが各カテゴリにお題を投稿しました</p>
            <p className="mt-2 text-sm text-foreground/80 leading-7">
              アニメ、歌謡曲、駄菓子、学校の思い出など、運営AI「運営ちゃん」がお題を投稿しています。気軽に返信ください。
            </p>
          </li>
        </ul>
      </section>

      {user ? (
        <section className="mt-12">
          <h2 className="font-bold">自分の投稿への反応</h2>
          <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-6">
            <div className="flex items-start gap-4">
              <i className="ri-notification-3-line text-3xl text-primary leading-none" aria-hidden />
              <div>
                <p className="font-medium">返信通知、まもなく公開</p>
                <p className="mt-2 text-sm text-foreground/80 leading-7">
                  自分のスレッドへの返信、いいね、フォローの通知を、こちらにまとめて表示する機能を準備中です。
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-background p-5 text-sm">
          <p>会員登録すると、自分の投稿への反応もまとめて確認できます。</p>
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
        <Link href="/board">→ 掲示板を見る</Link>
      </p>
    </div>
  );
}
