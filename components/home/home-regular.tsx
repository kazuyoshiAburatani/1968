import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RecentThreadCards } from "@/components/home/recent-thread-cards";
import { CurrentTopic } from "@/components/topics/current-topic";
import { PicksGrid } from "@/components/picks/picks-grid";
import { StatsRow } from "@/components/home/stats-row";
import { HotTopicsRail } from "@/components/home/hot-topics-rail";
import { NewMembersRail } from "@/components/home/new-members-rail";
import { MediaGalleryRail } from "@/components/home/media-gallery-rail";
import { CategoryIcon } from "@/components/category-icon";
import { fetchAllCategories } from "@/lib/cached-categories";
import { resolveBannerColor } from "@/lib/home-banner-colors";
import type { Tier } from "@/lib/auth/permissions";

// 1968 認証済（verified）向け本格ダッシュボード、2026 リフレッシュ版。
// ・全 12 カテゴリにアクセス可、閲覧・投稿の制限なし
// ・レイアウトは HomeMember と揃え、上部 KPI、中央フィード、右サイドバー、下部ギャラリー

type Category = {
  id: number;
  slug: string;
  name: string;
  icon?: string | null;
  tier: Tier;
};

type ThreadLite = {
  id: string;
  title: string;
  created_at: string;
  categories: { slug: string } | null;
};

const TIER_ACCENT: Record<Tier, string> = {
  A: "bg-primary/10 text-primary",
  B: "bg-accent/15 text-accent",
  C: "bg-emerald-100 text-emerald-700",
  D: "bg-amber-100 text-amber-700",
  L: "bg-rose-100 text-rose-700",
};

export async function HomeRegular({
  nickname,
  userId,
}: {
  nickname: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

  const cats = (await fetchAllCategories()) as unknown as Category[];

  const { data: myRecentData } = await supabase
    .from("threads")
    .select("id, title, created_at, categories(slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const myRecent = (myRecentData ?? []) as unknown as ThreadLite[];

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

  const firstA = cats.find((c) => c.tier === "A")?.slug ?? "nostalgia-anime";

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* あいさつバー */}
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
              1968 認証済
            </span>
          </div>
          <p
            className="mt-2 text-sm"
            style={{ color: banner.fg, opacity: 0.8 }}
          >
            全 12 カテゴリを自由に語れます。
          </p>
        </section>

        {/* KPI カード */}
        <StatsRow />

        {/* 2 カラム */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-6">
            {/* 投稿ボックス風クイックアクション */}
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

            {/* 最新の話題 */}
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">最新の話題</h2>
                <Link href="/timeline" className="text-sm text-primary">
                  もっと見る →
                </Link>
              </div>
              <RecentThreadCards limit={12} />
            </section>

            {/* 全カテゴリ */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                カテゴリを覗く
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cats.map((c) => (
                  <Link
                    key={c.id}
                    href={`/board/${c.slug}`}
                    className="bg-background rounded-xl p-4 shadow-sm border border-border/60 hover:shadow-md transition-shadow no-underline group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl ${TIER_ACCENT[c.tier]}`}
                      >
                        <CategoryIcon icon={c.icon} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                          {c.name}
                        </h3>
                        <p className="text-xs text-foreground/60 mt-0.5">
                          段階{c.tier}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* みんなの推し */}
            <section>
              <PicksGrid limit={6} />
            </section>
          </div>

          {/* サイドバー */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <CurrentTopic />
              <HotTopicsRail />
              <NewMembersRail />

              {/* 最近のマイ投稿 */}
              <div className="bg-background rounded-xl p-5 shadow-sm border border-border/60">
                <h3 className="font-bold mb-3">最近のマイ投稿</h3>
                {myRecent.length === 0 ? (
                  <p className="text-sm text-foreground/60">
                    まだ投稿がありません。
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {myRecent.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/board/${t.categories?.slug}/${t.id}`}
                          className="block no-underline hover:bg-muted/60 -mx-2 px-2 py-1.5 rounded"
                        >
                          <div className="text-sm font-medium truncate">
                            {t.title}
                          </div>
                          <div className="text-xs text-foreground/60 mt-0.5">
                            {new Date(t.created_at).toLocaleDateString("ja-JP")}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 全幅ギャラリー */}
      <MediaGalleryRail />
    </>
  );
}
