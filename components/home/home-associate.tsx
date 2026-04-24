import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SunLines } from "@/components/illustrations/sun-lines";
import { LatestThreadsList } from "@/components/home/latest-threads-list";
import type { Tier } from "@/lib/auth/permissions";

// 準会員（associate）向けダッシュボード。
// 段階A・B の最新スレッドと、段階C・D のチラ見せ、クイックアクションを配置。

type Category = {
  id: number;
  slug: string;
  name: string;
  tier: Tier;
};

export async function HomeAssociate({
  nickname,
  userId,
}: {
  nickname: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

  // 投稿可能な段階A カテゴリ
  const { data: postableData } = await supabase
    .from("categories")
    .select("id, slug, name, tier")
    .eq("tier", "A")
    .order("display_order");
  const postable = (postableData ?? []) as Category[];

  // 正会員になったら見える C/D カテゴリ（タイトルのチラ見せ）
  const { data: lockedData } = await supabase
    .from("categories")
    .select("id, slug, name, tier")
    .in("tier", ["C", "D"])
    .order("display_order");
  const locked = (lockedData ?? []) as Category[];

  // 自分の最近の投稿（1日の投稿数確認のためのカウントも兼ねる）
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: myToday } = await supabase
    .from("threads")
    .select("id, title, created_at, category_id")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* あいさつバー */}
      <section className="relative py-8 md:py-10 overflow-hidden">
        <div className="absolute top-0 right-0 text-accent/30 pointer-events-none">
          <SunLines size={180} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {nickname} さんのホーム
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-foreground mr-2">
            準会員
          </span>
          段階A・B を読んで、段階A に投稿できます。
        </p>
      </section>

      {/* クイックアクション */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/board"
          className="rounded-lg border border-border bg-background p-5 no-underline hover:bg-muted/40"
        >
          <p className="text-2xl">📋</p>
          <p className="mt-1 font-bold">掲示板TOP</p>
          <p className="mt-1 text-xs text-foreground/60">12カテゴリ一覧へ</p>
        </Link>
        <Link
          href={`/board/${postable[0]?.slug ?? "chitchat"}/new`}
          className="rounded-lg border border-primary bg-primary text-white p-5 no-underline hover:opacity-90"
        >
          <p className="text-2xl">📝</p>
          <p className="mt-1 font-bold">新しく書く</p>
          <p className="mt-1 text-xs opacity-80">段階Aに投稿できます</p>
        </Link>
        <Link
          href="/mypage"
          className="rounded-lg border border-border bg-background p-5 no-underline hover:bg-muted/40"
        >
          <p className="text-2xl">👤</p>
          <p className="mt-1 font-bold">マイページ</p>
          <p className="mt-1 text-xs text-foreground/60">プロフィール・課金</p>
        </Link>
      </section>

      {/* 投稿可能なカテゴリ */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">投稿できるカテゴリ（段階A）</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {postable.map((c) => (
            <li key={c.id}>
              <Link
                href={`/board/${c.slug}`}
                className="flex items-center justify-between rounded border border-border bg-background px-4 py-3 no-underline hover:bg-muted/40"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-foreground/60">1日3件まで</span>
              </Link>
            </li>
          ))}
        </ul>
        {myToday && myToday.length > 0 && (
          <p className="mt-3 text-xs text-foreground/60">
            今日のあなたの投稿、{myToday.length} 件
          </p>
        )}
      </section>

      {/* 最新スレッド（RLS で A+B 範囲） */}
      <section className="mt-12">
        <h2 className="text-lg font-bold">最新の話題</h2>
        <p className="mt-1 text-sm text-foreground/70">
          段階A・Bの最新10件
        </p>
        <div className="mt-4">
          <LatestThreadsList limit={10} />
        </div>
      </section>

      {/* 正会員アップグレード案内（C/D チラ見せ） */}
      <section className="mt-12 rounded-xl border-2 border-accent/50 bg-muted/40 p-6 md:p-8">
        <p className="text-sm tracking-wider text-accent">UPGRADE</p>
        <h2 className="mt-2 text-xl font-bold">
          正会員になると、もっと深い話ができます
        </h2>
        <p className="mt-3 text-foreground/80">
          身分証で本人確認した同い年の方々と、
          介護・夫婦・健康・お金などの話題を本音で語り合えます。
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
          {locked.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2"
            >
              <span aria-hidden>🔒</span>
              <span className="text-foreground/70">{c.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link
            href="/mypage"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-bold no-underline hover:opacity-90"
          >
            正会員へのアップグレードを検討する
          </Link>
        </p>
      </section>
    </div>
  );
}
