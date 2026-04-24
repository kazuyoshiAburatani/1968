import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RisingSun } from "@/components/illustrations/rising-sun";
import { LatestThreadsList } from "@/components/home/latest-threads-list";
import type { Tier } from "@/lib/auth/permissions";

// 無料会員（member）向けダッシュボード。
// ・段階A（4）を「投稿できるカテゴリ」、段階B（4）を「閲覧できるカテゴリ」、C/D（4）はグレーアウト
// ・課金アピールを控えめに、ページ下部に「正会員について」のリンクだけ置く

type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  tier: Tier;
  posting_limit_per_day: number | null;
};

export async function HomeMember({
  nickname,
  userId,
}: {
  nickname: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: catsData } = await supabase
    .from("categories")
    .select("id, slug, name, description, tier, posting_limit_per_day, display_order")
    .order("display_order");
  const cats = (catsData ?? []) as Category[];

  const tierA = cats.filter((c) => c.tier === "A");
  const tierB = cats.filter((c) => c.tier === "B");
  const locked = cats.filter((c) => c.tier === "C" || c.tier === "D");

  // 自分の今日の投稿を category_id で集計
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: myTodayData } = await supabase
    .from("threads")
    .select("category_id")
    .eq("user_id", userId)
    .gte("created_at", since);
  const todayCountByCat = new Map<number, number>();
  for (const row of myTodayData ?? []) {
    const cid = row.category_id as number;
    todayCountByCat.set(cid, (todayCountByCat.get(cid) ?? 0) + 1);
  }

  const firstA = tierA[0]?.slug ?? "chitchat";

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* あいさつバー */}
      <section className="bg-background rounded-lg p-6 shadow-sm border border-border relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {nickname} さんのホーム
              </h1>
              <span className="bg-muted text-foreground/80 border border-border px-3 py-1 rounded-full text-sm font-medium">
                会員
              </span>
            </div>
            <p className="text-foreground/70 text-sm">
              段階A・B の 8 カテゴリを閲覧、段階A に 1日3件まで投稿できます。
            </p>
          </div>
          <div className="hidden md:block text-accent/25">
            <RisingSun size={96} />
          </div>
        </div>
      </section>

      {/* クイックアクション */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction href="/board" icon="ri-clipboard-line" title="掲示板TOP" sub="12 カテゴリ一覧へ" />
        <QuickAction
          href={`/board/${firstA}/new`}
          icon="ri-edit-line"
          title="新しく書く"
          sub="段階A に投稿できます"
          primary
        />
        <QuickAction href="/mypage" icon="ri-user-line" title="マイページ" sub="プロフィール・設定" />
      </section>

      {/* 投稿できるカテゴリ（段階A） */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">
          投稿できるカテゴリ（段階A）
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tierA.map((c) => {
            const todayCount = todayCountByCat.get(c.id) ?? 0;
            const limit = c.posting_limit_per_day ?? 0;
            return (
              <Link
                key={c.id}
                href={`/board/${c.slug}`}
                className="bg-background rounded-lg p-4 shadow-sm border border-border hover:shadow-md transition-shadow min-h-[44px] group no-underline"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                  <span className="text-xs bg-muted text-foreground/80 px-2 py-1 rounded-full">
                    段階A
                  </span>
                </div>
                {c.description && (
                  <p className="text-sm text-foreground/60 mb-2">
                    {c.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-foreground/60">
                  <span>1日{limit}件まで</span>
                  <span>
                    今日の投稿、{todayCount}/{limit}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 閲覧できるカテゴリ（段階B） */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">
          閲覧できるカテゴリ（段階B）
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tierB.map((c) => (
            <Link
              key={c.id}
              href={`/board/${c.slug}`}
              className="bg-background rounded-lg p-4 shadow-sm border border-border hover:shadow-md transition-shadow min-h-[44px] group no-underline"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {c.name}
                </h3>
                <span className="text-xs bg-muted text-foreground/80 px-2 py-1 rounded-full">
                  段階B
                </span>
              </div>
              {c.description && (
                <p className="text-sm text-foreground/60">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* 最新の話題 */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">
          最新の話題（段階A・B）
        </h2>
        <div className="bg-background rounded-lg shadow-sm border border-border p-4 md:p-6">
          <LatestThreadsList limit={10} />
        </div>
      </section>

      {/* グレーアウトカテゴリ（C/D） */}
      <section>
        <h2 className="text-xl font-bold text-foreground/70 mb-4">
          正会員で語られているテーマ
        </h2>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 opacity-60">
          {locked.map((c) => (
            <li
              key={c.id}
              className="bg-muted/50 border border-border rounded-lg p-3 flex items-center gap-2 cursor-not-allowed"
              aria-disabled="true"
            >
              <i
                className="ri-lock-line text-foreground/40 shrink-0"
                aria-hidden
              />
              <span className="text-foreground/70 text-sm truncate">{c.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-center text-foreground/70">
          詳しくは{" "}
          <Link href="/mypage" className="font-medium">
            マイページ
          </Link>
          をご覧ください。
        </p>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  sub,
  primary,
}: {
  href: string;
  icon: string;
  title: string;
  sub: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-lg p-6 shadow-sm min-h-[44px] flex flex-col items-center text-center group no-underline transition-shadow " +
        (primary
          ? "bg-primary hover:opacity-90"
          : "bg-background border border-border hover:shadow-md")
      }
    >
      <div
        className={
          "w-12 h-12 flex items-center justify-center rounded-lg mb-3 transition-colors " +
          (primary
            ? "bg-white/20 group-hover:bg-white/30"
            : "bg-muted group-hover:bg-muted/70")
        }
      >
        <i
          className={
            icon + " text-xl " + (primary ? "text-white" : "text-foreground/70")
          }
          aria-hidden
        />
      </div>
      <h3
        className={
          "font-semibold mb-1 " + (primary ? "text-white" : "text-foreground")
        }
      >
        {title}
      </h3>
      <p
        className={
          "text-sm " + (primary ? "text-white/80" : "text-foreground/60")
        }
      >
        {sub}
      </p>
    </Link>
  );
}
