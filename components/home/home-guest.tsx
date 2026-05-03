import Link from "next/link";
import { ImageHero } from "./image-hero";
import { RecentThreadCards } from "./recent-thread-cards";

// 未ログインのランディング、ノート + 湯呑みのイラストヒーローで
// 「同年代と落ち着いて語らえる場」のブランド世界観を一目で伝える。
// 課金訴求は控えめ、主 CTA は「会員登録」と「掲示板をのぞく」。

export async function HomeGuest() {
  return (
    <div className="pb-12">
      <ImageHero
        title={
          <>
            昭和43年生まれだけの、
            <br className="hidden sm:block" />
            語らいの場
          </>
        }
        subtitle={
          <>
            同い年が集まる、ほっと一息つけるコミュニティ。
            <br />
            アニメ、歌謡曲、駄菓子の思い出から、家族・健康・お金の今まで。
          </>
        }
        cta={
          <>
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-primary text-white px-8 py-3.5 rounded-full text-base font-bold no-underline active:opacity-90 hover:opacity-90 min-w-[220px] shadow-sm"
            >
              会員登録（無料）
            </Link>
            <Link
              href="/board"
              className="inline-flex items-center justify-center border-2 border-primary text-primary bg-background px-8 py-3 rounded-full text-base font-bold no-underline active:bg-muted hover:bg-muted min-w-[220px]"
            >
              掲示板をのぞく →
            </Link>
          </>
        }
      />

      {/* 最近の話題 */}
      <section className="px-0 sm:px-4 py-6 sm:py-10 max-w-2xl mx-auto">
        <div className="px-4 sm:px-0 flex items-baseline justify-between mb-3">
          <h2 className="font-bold text-lg">最近の話題</h2>
          <Link href="/timeline" className="text-sm">
            もっと見る →
          </Link>
        </div>
        <RecentThreadCards limit={6} />
      </section>

      {/* ベータ募集バナー */}
      <section className="px-4 py-6">
        <div className="max-w-2xl mx-auto rounded-2xl border border-primary/30 bg-muted/40 p-6 text-center">
          <p className="text-xs tracking-widest text-foreground/60 uppercase">
            Beta Testers Wanted
          </p>
          <h2 className="mt-2 text-xl font-bold leading-snug">
            ベータテスター募集中
            <br />
            正会員プラン1年無料の特典付き
          </h2>
          <p className="mt-3 text-sm text-foreground/80 leading-7">
            正式公開に向けて、サービスを一緒に育ててくださる方を募集しています。
          </p>
          <div className="mt-5">
            <Link
              href="/beta"
              className="inline-flex items-center justify-center bg-primary text-white px-7 py-3 rounded-full text-base font-medium no-underline active:opacity-90 min-h-[var(--spacing-tap)]"
            >
              詳細を見る →
            </Link>
          </div>
        </div>
      </section>

      {/* 3 つの特徴 */}
      <section className="px-4 py-6 max-w-3xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-muted/40 border border-border p-5 text-center"
            >
              <div className="text-3xl mb-2" aria-hidden>
                {f.emoji}
              </div>
              <h3 className="font-bold text-base mb-1.5 text-primary">
                {f.title}
              </h3>
              <p className="text-sm text-foreground/75 leading-7">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    emoji: "🤝",
    title: "同い年だけの安心感",
    body: "1968年生まれだけが参加できる、特別な閉じた場所です。",
  },
  {
    emoji: "💬",
    title: "本音で話せる 12 カテゴリ",
    body: "懐かしい話題から、今の暮らし・家族・お金まで。",
  },
  {
    emoji: "🛡",
    title: "本人確認済の安心運営",
    body: "身分証で年齢確認、なりすましのいない落ち着いた語らい。",
  },
];
