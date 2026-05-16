// カテゴリアイコンの統一レンダラ。
// value が "ri-" で始まる場合は Remix Icon の <i> として描画、
// それ以外（絵文字など）はそのままテキストとして描画する。
// 過去に絵文字を保存していたカテゴリにも後方互換で対応できる。

type Props = {
  icon: string | null | undefined;
  // 未指定時の既定アイコン、Remix Icon クラス名
  fallback?: string;
  // 親で size 制御する場合に追加できるクラス
  className?: string;
};

export function CategoryIcon({
  icon,
  fallback = "ri-bookmark-line",
  className,
}: Props) {
  const value = (icon ?? "").trim() || fallback;

  // Remix Icon は CSS クラスで描画
  if (value.startsWith("ri-")) {
    return (
      <i
        aria-hidden
        className={`${value}${className ? " " + className : ""}`}
      />
    );
  }

  // 旧形式（絵文字）はそのままテキスト描画
  return (
    <span aria-hidden className={className}>
      {value}
    </span>
  );
}

// 管理画面のピッカーで表示する、テーマ別のアイコン候補。
// Remix Icon 4.6 ベース、line 系で統一して視覚的にシンプルに保つ。
export const CATEGORY_ICON_GROUPS: ReadonlyArray<{
  label: string;
  icons: ReadonlyArray<string>;
}> = [
  {
    label: "思い出・カルチャー",
    icons: [
      "ri-film-line",
      "ri-movie-line",
      "ri-music-2-line",
      "ri-mic-line",
      "ri-tv-line",
      "ri-radio-line",
      "ri-book-open-line",
      "ri-newspaper-line",
      "ri-camera-line",
      "ri-cake-line",
      "ri-game-line",
      "ri-pencil-ruler-line",
    ],
  },
  {
    label: "暮らし・住まい",
    icons: [
      "ri-home-line",
      "ri-home-heart-line",
      "ri-leaf-line",
      "ri-plant-line",
      "ri-sun-line",
      "ri-moon-line",
      "ri-cup-line",
      "ri-restaurant-line",
      "ri-fridge-line",
      "ri-temp-hot-line",
    ],
  },
  {
    label: "健康・体",
    icons: [
      "ri-heart-pulse-line",
      "ri-hospital-line",
      "ri-mental-health-line",
      "ri-walk-line",
      "ri-run-line",
      "ri-pulse-line",
      "ri-medicine-bottle-line",
      "ri-emotion-line",
    ],
  },
  {
    label: "仕事・お金",
    icons: [
      "ri-briefcase-line",
      "ri-suitcase-line",
      "ri-coin-line",
      "ri-money-cny-circle-line",
      "ri-bank-line",
      "ri-line-chart-line",
      "ri-bar-chart-line",
      "ri-wallet-line",
      "ri-safe-line",
    ],
  },
  {
    label: "家族・人",
    icons: [
      "ri-parent-line",
      "ri-team-line",
      "ri-user-heart-line",
      "ri-group-line",
      "ri-baby-line",
      "ri-heart-line",
      "ri-handshake-line",
      "ri-chat-heart-line",
    ],
  },
  {
    label: "学校・地元",
    icons: [
      "ri-school-line",
      "ri-graduation-cap-line",
      "ri-map-pin-line",
      "ri-map-2-line",
      "ri-train-line",
      "ri-bus-line",
      "ri-bike-line",
      "ri-road-map-line",
    ],
  },
  {
    label: "趣味・遊び",
    icons: [
      "ri-football-line",
      "ri-basketball-line",
      "ri-ping-pong-line",
      "ri-palette-line",
      "ri-brush-line",
      "ri-gamepad-line",
      "ri-headphone-line",
      "ri-flight-takeoff-line",
      "ri-ship-line",
      "ri-fish-line",
    ],
  },
  {
    label: "集まり・会話",
    icons: [
      "ri-chat-3-line",
      "ri-chat-quote-line",
      "ri-discuss-line",
      "ri-megaphone-line",
      "ri-calendar-event-line",
      "ri-calendar-2-line",
      "ri-time-line",
      "ri-hand-coin-line",
    ],
  },
  {
    label: "ラウンジ・特別",
    icons: [
      "ri-medal-line",
      "ri-vip-crown-line",
      "ri-star-line",
      "ri-sparkling-line",
      "ri-award-line",
      "ri-flower-line",
      "ri-fire-line",
      "ri-treasure-map-line",
    ],
  },
  {
    label: "その他",
    icons: [
      "ri-bookmark-line",
      "ri-pushpin-line",
      "ri-question-line",
      "ri-information-line",
      "ri-lightbulb-line",
      "ri-folder-line",
      "ri-hashtag",
      "ri-checkbox-circle-line",
    ],
  },
];
