// 1968 トップページの写真コラージュ風ヒーロー。
// 著作権を避けるため実写真ではなく、世代を象徴する絵文字＋色のタイルでコラージュ。
// 12 タイルをグリッド配置、低速 fade-in で柔らかさを演出。

const TILES: Array<{ emoji: string; bg: string; label: string }> = [
  { emoji: "🎬", bg: "#fde9d3", label: "アニメ" },
  { emoji: "🎤", bg: "#f3d6db", label: "歌謡曲" },
  { emoji: "📺", bg: "#dde6f3", label: "ドラマ" },
  { emoji: "🍬", bg: "#f3e3c0", label: "駄菓子" },
  { emoji: "🪁", bg: "#d8ead4", label: "遊び" },
  { emoji: "💬", bg: "#e7dfef", label: "死語" },
  { emoji: "🎒", bg: "#dee9d9", label: "学校" },
  { emoji: "🥂", bg: "#f1ddc0", label: "バブル" },
  { emoji: "🌿", bg: "#dceadc", label: "暮らし" },
  { emoji: "🏠", bg: "#f0e7d4", label: "家族" },
  { emoji: "💴", bg: "#e8e0c8", label: "お金" },
  { emoji: "🍻", bg: "#f0d9c0", label: "オフ会" },
];

export function PhotoCollageHero({
  title,
  subtitle,
  cta,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <section className="relative px-4 py-8 sm:py-12 overflow-hidden">
      {/* 背景の 4x3 タイルグリッド */}
      <div
        aria-hidden
        className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-1.5 sm:gap-2 opacity-90"
      >
        {TILES.map((t, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-3xl sm:text-5xl rounded-md"
            style={{ backgroundColor: t.bg }}
          >
            {t.emoji}
          </div>
        ))}
      </div>
      {/* 背景の薄い白オーバーレイで文字読みやすく */}
      <div
        aria-hidden
        className="absolute inset-0 bg-background/75 backdrop-blur-[1px]"
      />
      <div className="relative z-10 max-w-3xl mx-auto text-center py-8 sm:py-14">
        <p className="text-xs tracking-widest text-accent font-bold mb-2">
          1968 — SHOWA 43 ONLY
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-4 text-sm sm:text-base text-foreground/85 leading-7 max-w-2xl mx-auto">
            {subtitle}
          </div>
        )}
        {cta && (
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            {cta}
          </div>
        )}
      </div>
    </section>
  );
}
