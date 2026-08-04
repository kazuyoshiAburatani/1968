import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PicksGrid } from "@/components/picks/picks-grid";
import { StatsRow } from "@/components/home/stats-row";
import { NewMembersRail } from "@/components/home/new-members-rail";
import { MediaGalleryRail } from "@/components/home/media-gallery-rail";
import { TopicFeed } from "@/components/topics/topic-feed";
import { resolveBannerColor } from "@/lib/home-banner-colors";

// 1968 認証済（verified）向けダッシュボード、お題ドリブン主軸版。
// HomeMember と情報構造は同じ、バッジと下部に「みんなの推し」を追加。

type ThreadLite = {
  id: string;
  title: string;
  created_at: string;
  categories: { slug: string } | null;
};

export async function HomeRegular({
  nickname,
  userId,
}: {
  nickname: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: myRecentData } = await supabase
    .from("threads")
    .select("id, title, created_at, categories(slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const myRecent = (myRecentData ?? []) as unknown as ThreadLite[];

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

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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
            お題への回答や、みんなの答えにリアクションを送れます。
          </p>
        </section>

        {/* KPI カード */}
        <StatsRow />

        {/* 2 カラム */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-8">
            <TopicFeed />

            {/* みんなの推し、認証済向けの追加コンテンツ */}
            <section>
              <PicksGrid limit={6} />
            </section>
          </div>

          {/* サイドバー */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <NewMembersRail />

              {/* 最近のマイ投稿（掲示板時代のもの、アーカイブ表示） */}
              {myRecent.length > 0 && (
                <div className="bg-background rounded-xl p-4 shadow-sm border border-border/60">
                  <h3 className="text-sm font-bold mb-3">
                    掲示板の過去投稿（アーカイブ）
                  </h3>
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
                            {new Date(t.created_at).toLocaleDateString(
                              "ja-JP",
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-background rounded-xl p-4 shadow-sm border border-border/60">
                <div className="text-xs text-foreground/60 mb-2">
                  もっと深く語りたい方へ
                </div>
                <Link
                  href="/board"
                  className="text-sm font-medium text-primary no-underline hover:underline"
                >
                  掲示板アーカイブを見る →
                </Link>
                <p className="mt-1 text-xs text-foreground/50 leading-6">
                  12 カテゴリのスレッド形式は現在アーカイブ中、閲覧のみ可能です。
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MediaGalleryRail />
    </>
  );
}
