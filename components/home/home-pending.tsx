import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enso } from "@/components/illustrations/enso";
import type { Tier } from "@/lib/auth/permissions";

// 登録済み・未課金（pending）向け。課金誘導を主軸にしたダッシュボード。Readdy デザイン準拠。

type ThreadCard = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  categories: { slug: string } | null;
};

type Category = {
  id: number;
  slug: string;
  name: string;
  tier: Tier;
};

// 正会員の世界セクションで強調するカテゴリとアイコンの対応
const FEATURED_CD: Array<{ slug: string; emoji: string; tagline: string }> = [
  { slug: "parents-care", emoji: "🏥", tagline: "同世代の介護経験を共有" },
  { slug: "partner", emoji: "💑", tagline: "長年連れ添った夫婦の知恵" },
  { slug: "money-retirement", emoji: "💰", tagline: "老後の資金計画や年金" },
  { slug: "health", emoji: "🌸", tagline: "50代以降の健康管理" },
];

export async function HomePending({ nickname }: { nickname: string }) {
  const supabase = await createSupabaseServerClient();

  // 段階A（ゲスト・pending 閲覧可）の最新スレッド 8 件
  const { data: threadsData } = await supabase
    .from("threads")
    .select("id, title, body, created_at, categories(slug)")
    .order("created_at", { ascending: false })
    .limit(8);
  const threads = (threadsData ?? []) as unknown as ThreadCard[];

  // 正会員の世界、C/D カテゴリの実データ
  const { data: cdData } = await supabase
    .from("categories")
    .select("id, slug, name, tier")
    .in("slug", FEATURED_CD.map((f) => f.slug));
  const cdMap = new Map<string, Category>();
  for (const c of (cdData ?? []) as Category[]) cdMap.set(c.slug, c);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* あいさつバー */}
      <header className="bg-background p-6 md:p-8 mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
            {nickname} さん、ようこそ
          </h1>
          <p className="text-base md:text-lg text-foreground/80">
            昭和43年生まれ限定コミュニティ「1968」
          </p>
        </div>
        <div className="shrink-0 text-foreground/60">
          <Enso size={80} />
        </div>
      </header>

      {/* 最新の話題（段階A） */}
      {threads.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-primary mb-6">
            最新の話題（段階A）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/board/${t.categories?.slug}/${t.id}`}
                className="bg-background p-5 md:p-6 rounded-lg shadow-sm border border-border no-underline hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                  {t.title}
                </h3>
                <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
                  {t.body.slice(0, 80)}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-foreground/50">
                    {new Date(t.created_at).toLocaleDateString("ja-JP")}
                  </span>
                  <span className="text-xs bg-muted px-2 py-1 rounded text-foreground/80">
                    閲覧のみ
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* メインの課金誘導カード */}
      <section className="bg-background border-4 border-primary p-6 md:p-8 mb-8 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-primary mb-3">
            より深いつながりを求めませんか？
          </h2>
          <p className="text-base md:text-lg text-foreground/80">
            現在は段階Aコンテンツのみご覧いただけます。準会員になると、段階Aへの投稿ができるようになります。
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href="/register?plan=associate"
            className="block w-full text-center bg-accent text-white text-lg md:text-xl font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity no-underline min-h-[56px] whitespace-nowrap"
          >
            月180円の準会員に入会する
          </Link>
          <Link
            href="/register?plan=regular"
            className="block w-full text-center bg-primary text-white text-base md:text-lg font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-opacity no-underline min-h-[48px] whitespace-nowrap"
          >
            正会員（月480円）で全機能を利用する
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-foreground/60">
          準会員、投稿・コメント機能 ／ 正会員、全カテゴリ閲覧＋オフ会＋本人確認バッジ
        </p>
      </section>

      {/* 正会員の世界紹介カード */}
      <section className="bg-gradient-to-r from-primary to-primary/80 p-6 md:p-8 rounded-lg text-white mb-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-center">
          正会員限定の特別な世界
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURED_CD.map((f) => {
            const c = cdMap.get(f.slug);
            return (
              <div key={f.slug} className="text-center">
                <div
                  className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"
                  aria-hidden
                >
                  <span className="text-2xl">{f.emoji}</span>
                </div>
                <h3 className="font-medium mb-2">{c?.name ?? f.slug}</h3>
                <p className="text-sm opacity-80">{f.tagline}</p>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-6">
          <Link
            href="/register?plan=regular"
            className="inline-block bg-background text-primary px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity no-underline"
          >
            正会員になって全てを見る
          </Link>
        </div>
      </section>

      {/* フッター（掲示板TOP誘導） */}
      <div className="bg-primary text-background p-4 rounded-lg text-center">
        <Link
          href="/board"
          className="inline-flex items-center justify-center w-full py-3 px-6 text-lg font-medium hover:opacity-90 transition-opacity text-background no-underline"
        >
          <span>掲示板TOPへ</span>
          <svg
            className="ml-2 w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
