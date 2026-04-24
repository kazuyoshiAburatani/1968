import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SunLines } from "@/components/illustrations/sun-lines";
import { LatestThreadsList } from "@/components/home/latest-threads-list";
import type { Tier } from "@/lib/auth/permissions";

// 正会員（regular）向けダッシュボード。全12カテゴリにアクセス可。
// 段階別グリッド、最新スレッド、マイ最近の活動をまとめる。

type Category = {
  id: number;
  slug: string;
  name: string;
  tier: Tier;
  description: string | null;
};

type ThreadLite = {
  id: string;
  title: string;
  created_at: string;
  categories: { slug: string } | null;
};

const TIER_LABEL: Record<Tier, string> = {
  A: "どなたでも",
  B: "準会員から",
  C: "正会員のみ",
  D: "正会員・入会3ヶ月以上",
};

export async function HomeRegular({
  nickname,
  userId,
}: {
  nickname: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

  // 全 12 カテゴリを段階別に取得
  const { data: catsData } = await supabase
    .from("categories")
    .select("id, slug, name, tier, description, display_order")
    .order("display_order");
  const cats = (catsData ?? []) as Category[];
  const byTier = new Map<Tier, Category[]>();
  for (const c of cats) {
    const list = byTier.get(c.tier) ?? [];
    list.push(c);
    byTier.set(c.tier, list);
  }

  // 自分の直近の投稿 5 件
  const { data: myRecentData } = await supabase
    .from("threads")
    .select("id, title, created_at, categories(slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const myRecent = (myRecentData ?? []) as unknown as ThreadLite[];

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* あいさつバー */}
      <section className="relative py-8 md:py-10 overflow-hidden">
        <div className="absolute top-0 right-0 text-primary/40 pointer-events-none">
          <SunLines size={200} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {nickname} さんのホーム
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-white mr-2">
            正会員
          </span>
          全12カテゴリを自由に語れます。
        </p>
      </section>

      {/* クイックアクション */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Link
          href="/board"
          className="rounded-lg border border-border bg-background p-5 no-underline hover:bg-muted/40"
        >
          <p className="text-2xl">📋</p>
          <p className="mt-1 font-bold">掲示板TOP</p>
        </Link>
        <Link
          href="/board/chitchat/new"
          className="rounded-lg border border-primary bg-primary text-white p-5 no-underline hover:opacity-90"
        >
          <p className="text-2xl">📝</p>
          <p className="mt-1 font-bold">新しく書く</p>
        </Link>
        <Link
          href="/board/meetups"
          className="rounded-lg border border-border bg-background p-5 no-underline hover:bg-muted/40"
        >
          <p className="text-2xl">🗓</p>
          <p className="mt-1 font-bold">オフ会</p>
        </Link>
        <Link
          href="/mypage"
          className="rounded-lg border border-border bg-background p-5 no-underline hover:bg-muted/40"
        >
          <p className="text-2xl">👤</p>
          <p className="mt-1 font-bold">マイページ</p>
        </Link>
      </section>

      {/* 2カラムレイアウト、PC で 左=最新、右=カテゴリ */}
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* 最新スレッド（大きめ） */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-bold">最新の話題</h2>
          <p className="mt-1 text-sm text-foreground/70">
            全カテゴリから直近20件
          </p>
          <div className="mt-4">
            <LatestThreadsList limit={20} />
          </div>
        </section>

        {/* 右サイド：カテゴリ一覧・マイ活動 */}
        <aside className="space-y-8">
          <section>
            <h2 className="text-lg font-bold">カテゴリ</h2>
            <div className="mt-3 space-y-4">
              {(["A", "B", "C", "D"] as Tier[]).map((tier) => {
                const list = byTier.get(tier) ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={tier}>
                    <p className="text-xs font-bold text-foreground/60">
                      段階{tier} ・ {TIER_LABEL[tier]}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {list.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/board/${c.slug}`}
                            className="block px-3 py-2 rounded hover:bg-muted/40 no-underline text-sm"
                          >
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold">最近のマイ投稿</h2>
            {myRecent.length === 0 ? (
              <p className="mt-3 text-sm text-foreground/60">
                まだ投稿がありません。
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {myRecent.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/board/${t.categories?.slug}/${t.id}`}
                      className="block px-3 py-2 rounded hover:bg-muted/40 no-underline"
                    >
                      <p className="truncate font-medium">{t.title}</p>
                      <p className="text-xs text-foreground/60">
                        {new Date(t.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* 将来の機能案内 */}
      <section className="mt-12 rounded-xl border border-border bg-muted/40 p-6">
        <h2 className="text-base font-bold">今後のアップデート</h2>
        <ul className="mt-3 space-y-1 text-sm text-foreground/80">
          <li>・メッセージ（DM）、ご自身の会員同士で1対1の語らい（開発中）</li>
          <li>・オフ会の正式申込と開催履歴（入会3ヶ月以上で参加可）</li>
          <li>・本人確認済バッジ（身分証提出でフェーズ5以降付与）</li>
        </ul>
      </section>
    </div>
  );
}
