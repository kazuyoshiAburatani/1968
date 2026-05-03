// 1968 トップページの画像ヒーロー。
// アイボリー水彩タッチのイラスト（ノート＋湯呑み＋小さな花束）を視覚アンカーにして、
// 「同年代と落ち着いて語らえる場」というブランドの世界観を一目で伝える。
//
// レイアウト、
//   - デスクトップ：画像左、テキスト右の 2 カラム
//   - モバイル：画像が上、テキストが下のスタック

import Image from "next/image";

export function ImageHero({
  title,
  subtitle,
  cta,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <section className="px-4 py-8 sm:py-14 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
        {/* 画像、モバイルでは順序 1（上）、デスクトップでは左 */}
        <div className="order-1 md:order-1 relative">
          <Image
            src="/illustrations/empty-threads.png"
            alt="開いたノートと湯呑み、ふたりの会話を待つ机"
            width={800}
            height={600}
            priority
            className="w-full h-auto rounded-2xl"
          />
        </div>

        {/* テキスト + CTA、モバイルでは順序 2（下）、デスクトップでは右 */}
        <div className="order-2 md:order-2">
          <p className="text-xs tracking-widest text-accent font-bold mb-3">
            1968 — SHOWA 43 ONLY
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-4 text-base sm:text-lg text-foreground/80 leading-8">
              {subtitle}
            </div>
          )}
          {cta && (
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {cta}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
