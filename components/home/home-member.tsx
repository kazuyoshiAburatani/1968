import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatsRow } from "@/components/home/stats-row";
import { NewMembersRail } from "@/components/home/new-members-rail";
import { MediaGalleryRail } from "@/components/home/media-gallery-rail";
import { TopicFeed } from "@/components/topics/topic-feed";
import { resolveBannerColor } from "@/lib/home-banner-colors";

// 無料会員（member）向けダッシュボード、2026 リフレッシュ + 「お題ドリブン」化。
// ・掲示板 12 カテゴリはアーカイブ扱い、ホームの主導線はお題フィード
// ・上部に KPI、中央にお題フィード（レス投稿 + リアクション）、右に新メンバー
// ・下部に投稿添付から自動生成する思い出ギャラリー

export async function HomeMember({
  nickname,
  userId,
}: {
  nickname: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

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

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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
              会員
            </span>
          </div>
          <p
            className="mt-2 text-sm"
            style={{ color: banner.fg, opacity: 0.8 }}
          >
            今週のお題に一言、リアクションだけでも参加できます。
          </p>
        </section>

        {/* KPI カード 4 枚、実データ */}
        <StatsRow />

        {/* 2 カラム、メイン(左) + サイドバー(右、lg のみ) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            {/* お題フィード、ホームの主コンテンツ */}
            <TopicFeed />
          </div>

          {/* サイドバー、sticky で追従 */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <NewMembersRail />

              {/* 掲示板アーカイブへのささやかな導線 */}
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

      {/* 全幅の思い出ギャラリー、投稿添付から自動生成 */}
      <MediaGalleryRail />
    </>
  );
}
