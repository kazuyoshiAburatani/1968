import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SunLines } from "@/components/illustrations/sun-lines";
import { RecentThreadCards } from "@/components/home/recent-thread-cards";
import type { Tier } from "@/lib/auth/permissions";

// 正会員（regular）向け本格ダッシュボード。Readdy レイアウト採用。
// 2カラム（左=最新スレッド / 右=カテゴリナビ＋マイ最近）、下にアップデート案内。

type Category = {
  id: number;
  slug: string;
  name: string;
  tier: Tier;
};

type ThreadLite = {
  id: string;
  title: string;
  created_at: string;
  categories: { slug: string } | null;
};

const TIER_LABEL: Record<Tier, string> = {
  A: "段階A ・ どなたでも",
  B: "段階B ・ 準会員から",
  C: "段階C ・ 正会員のみ",
  D: "段階D ・ 入会3ヶ月以上",
};

export async function HomeRegular({
  nickname,
  userId,
}: {
  nickname: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: catsData } = await supabase
    .from("categories")
    .select("id, slug, name, tier, display_order")
    .order("display_order");
  const cats = (catsData ?? []) as Category[];
  const byTier = new Map<Tier, Category[]>();
  for (const c of cats) {
    const list = byTier.get(c.tier) ?? [];
    list.push(c);
    byTier.set(c.tier, list);
  }

  const { data: myRecentData } = await supabase
    .from("threads")
    .select("id, title, created_at, categories(slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const myRecent = (myRecentData ?? []) as unknown as ThreadLite[];

  return (
    <>
      {/* あいさつバー */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {nickname} さんのホーム
              </h1>
              <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
                正会員
              </span>
            </div>
            <div className="hidden lg:block text-accent/40">
              <SunLines size={120} />
            </div>
          </div>
          <p className="text-foreground/70 mt-2 text-sm">
            全12カテゴリを自由に語れます。
          </p>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            href="/board"
            icon="ri-clipboard-line"
            label="掲示板TOP"
          />
          <QuickAction
            href="/board/nostalgia-anime/new"
            icon="ri-edit-line"
            label="新しく書く"
            primary
          />
          <QuickAction
            href="/board/meetups"
            icon="ri-calendar-event-line"
            label="オフ会"
          />
          <QuickAction href="/mypage" icon="ri-user-line" label="マイページ" />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* 左、最新の話題、LINE 風カード */}
          <div className="lg:col-span-2">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-foreground">最新の話題</h2>
                <Link href="/timeline" className="text-sm font-medium">
                  もっと見る →
                </Link>
              </div>
              <RecentThreadCards limit={12} />
            </section>
          </div>

          {/* 右、サイドバー */}
          <aside className="mt-8 lg:mt-0 space-y-6">
            {/* カテゴリ */}
            <section className="bg-background rounded-lg border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">カテゴリ</h3>
              <div className="space-y-4">
                {(["A", "B", "C", "D"] as Tier[]).map((tier) => {
                  const list = byTier.get(tier) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <div key={tier}>
                      <h4 className="text-sm font-medium text-foreground/70 mb-2">
                        {TIER_LABEL[tier]}
                      </h4>
                      <div className="space-y-0.5">
                        {list.map((c) => (
                          <Link
                            key={c.id}
                            href={`/board/${c.slug}`}
                            className="block text-sm text-foreground/80 hover:text-primary hover:bg-muted/30 no-underline px-2 py-1.5 rounded"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 最近のマイ投稿 */}
            <section className="bg-background rounded-lg border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">
                最近のマイ投稿
              </h3>
              {myRecent.length === 0 ? (
                <p className="text-sm text-foreground/60">
                  まだ投稿がありません。
                </p>
              ) : (
                <div className="space-y-3">
                  {myRecent.map((t) => (
                    <Link
                      key={t.id}
                      href={`/board/${t.categories?.slug}/${t.id}`}
                      className="block no-underline hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded"
                    >
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {t.title}
                      </h4>
                      <p className="text-xs text-foreground/60 mt-0.5">
                        {new Date(t.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* 今後のアップデート案内 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            今後のアップデート予定
          </h3>
          <ul className="space-y-2 text-sm text-foreground/80">
            <UpdateItem>DM（ダイレクトメッセージ）機能の実装</UpdateItem>
            <UpdateItem>オフ会申込システム、入会3ヶ月以上で参加可</UpdateItem>
            <UpdateItem>本人確認済バッジの表示（身分証確認フロー）</UpdateItem>
            <UpdateItem>運営からのお知らせ・今週のお題の配信</UpdateItem>
          </ul>
        </div>
      </div>
    </>
  );
}

function QuickAction({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "block rounded-lg p-6 text-center no-underline transition-colors " +
        (primary
          ? "bg-primary text-white hover:opacity-90"
          : "bg-background border border-border hover:bg-muted/40 text-foreground")
      }
    >
      <div className="w-8 h-8 flex items-center justify-center mx-auto mb-3">
        <i className={`${icon} text-2xl`} aria-hidden />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function UpdateItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="inline-block w-2 h-2 bg-accent rounded-full shrink-0"
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}
