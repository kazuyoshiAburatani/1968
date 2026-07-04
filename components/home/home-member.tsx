import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RecentThreadCards } from "@/components/home/recent-thread-cards";
import { CurrentTopic } from "@/components/topics/current-topic";
import { StatsRow } from "@/components/home/stats-row";
import { HotTopicsRail } from "@/components/home/hot-topics-rail";
import { NewMembersRail } from "@/components/home/new-members-rail";
import { MediaGalleryRail } from "@/components/home/media-gallery-rail";
import { CategoryIcon } from "@/components/category-icon";
import { fetchAllCategories } from "@/lib/cached-categories";
import { resolveBannerColor } from "@/lib/home-banner-colors";
import type { Tier } from "@/lib/auth/permissions";

// 無料会員（member）向けダッシュボード、2026 リフレッシュ版。
// ・段階A（4）を「投稿できる」、段階B（4）を「閲覧できる」、C/D（4）はグレーアウト
// ・上部に KPI カード、中央にフィード、右サイドバーにホットトピック等
// ・下部に投稿添付から自動生成する思い出ギャラリー

type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon?: string | null;
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

  const cats = (await fetchAllCategories()) as unknown as Category[];

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

  // home_banner_color、マイグレーション未適用なら null フォールバック
  let bannerColorValue: string | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("home_banner_color")
      .eq("user_id", userId)
      .maybeSingle();
    bannerColorValue =
      (data?.home_banner_color as string | null | undefined) ?? null;
  } catch {
    // カラム未適用、既定色のまま
  }
  const banner = resolveBannerColor(bannerColorValue);

  const firstA = tierA[0]?.slug ?? "nostalgia-anime";

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* あいさつバー、home_banner_color で会員ごとに個性を出す */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-sm border border-border/50"
          style={{ backgroundColor: banner.bg, color: banner.fg }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-xl sm:text-2xl font-bold"
              style={{ color: banner.fg }}
            >
              {nickname} さんのホーム
            </h1>
            <span
              className="border px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
              style={{
                backgroundColor: banner.fg,
                color: banner.bg,
                borderColor: banner.fg,
              }}
            >
              一般会員
            </span>
          </div>
          <p
            className="mt-2 text-sm"
            style={{ color: banner.fg, opacity: 0.8 }}
          >
            段階A・B の 8 カテゴリを閲覧、段階A に 1 日 3 件まで投稿できます。
          </p>
        </section>

        {/* KPI カード 4 枚、実データ */}
        <StatsRow />

        {/* 2 カラム、メイン(左) + サイドバー(右、lg のみ) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-6">
            {/* クイックアクション、投稿ボックス風 */}
            <section className="bg-background rounded-2xl p-4 sm:p-5 shadow-sm border border-border/60">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium text-sm"
                >
                  {nickname.slice(0, 1)}
                </span>
                <Link
                  href={`/board/${firstA}/new`}
                  className="flex-1 bg-muted/70 rounded-full px-5 py-3 text-sm text-foreground/60 no-underline hover:bg-muted transition-colors"
                >
                  今日の出来事、あの頃の話をシェアしよう
                </Link>
                <Link
                  href={`/board/${firstA}/new`}
                  className="hidden sm:inline-flex items-center px-5 py-3 rounded-full bg-primary text-white text-sm font-medium no-underline hover:opacity-90 transition-opacity"
                >
                  投稿
                </Link>
              </div>
            </section>

            {/* 最新の話題フィード */}
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">最新の話題</h2>
                <Link href="/timeline" className="text-sm text-primary">
                  もっと見る →
                </Link>
              </div>
              <RecentThreadCards limit={8} />
            </section>

            {/* 投稿できるカテゴリ（段階A）、今日の投稿数を可視化 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                あなたが投稿できるカテゴリ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tierA.map((c) => {
                  const todayCount = todayCountByCat.get(c.id) ?? 0;
                  const limit = c.posting_limit_per_day ?? 0;
                  return (
                    <Link
                      key={c.id}
                      href={`/board/${c.slug}`}
                      className="bg-background rounded-xl p-4 shadow-sm border border-border/60 hover:shadow-md transition-shadow no-underline group"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="shrink-0 w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl"
                        >
                          <CategoryIcon icon={c.icon} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                            {c.name}
                          </h3>
                          <p className="text-xs text-foreground/60 mt-0.5">
                            今日の投稿、{todayCount}/{limit}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* 閲覧できるカテゴリ（段階B） */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                閲覧できるカテゴリ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tierB.map((c) => (
                  <Link
                    key={c.id}
                    href={`/board/${c.slug}`}
                    className="bg-background rounded-xl p-4 shadow-sm border border-border/60 hover:shadow-md transition-shadow no-underline group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="shrink-0 w-11 h-11 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xl"
                      >
                        <CategoryIcon icon={c.icon} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                          {c.name}
                        </h3>
                        {c.description && (
                          <p className="text-xs text-foreground/60 line-clamp-1 mt-0.5">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* 段階C/D、正会員限定 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-foreground/70 mb-4">
                正会員で語られているテーマ
              </h2>
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 opacity-60">
                {locked.map((c) => (
                  <li
                    key={c.id}
                    className="bg-muted/60 border border-border rounded-lg p-3 flex items-center gap-2 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <i
                      className="ri-lock-line text-foreground/40 shrink-0"
                      aria-hidden
                    />
                    <span className="text-foreground/70 text-sm truncate">
                      {c.name}
                    </span>
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

          {/* サイドバー、sticky で追従 */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <CurrentTopic />
              <HotTopicsRail />
              <NewMembersRail />
            </div>
          </aside>
        </div>
      </div>

      {/* 全幅の思い出ギャラリー、投稿添付から自動生成 */}
      <MediaGalleryRail />
    </>
  );
}
