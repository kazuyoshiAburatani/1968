import Image from "next/image";
import { getMediaUrl, type MediaItem } from "@/lib/media";
import { CategoryIcon } from "@/components/category-icon";

// スレッド一覧で各行に表示する小さなサムネイル。
// media に画像があれば最初の 1 枚を表示、無ければカテゴリ絵文字のプレースホルダー。

const CATEGORY_LOOKS: Record<string, { emoji: string; bg: string }> = {
  "nostalgia-anime": { emoji: "🎬", bg: "#fde9d3" },
  "nostalgia-music": { emoji: "🎤", bg: "#f3d6db" },
  "nostalgia-tv": { emoji: "📺", bg: "#dde6f3" },
  "nostalgia-snacks": { emoji: "🍬", bg: "#f3e3c0" },
  "nostalgia-play": { emoji: "🪁", bg: "#d8ead4" },
  "nostalgia-words": { emoji: "💬", bg: "#e7dfef" },
  "nostalgia-school": { emoji: "🎒", bg: "#dee9d9" },
  "bubble-era": { emoji: "🥂", bg: "#f1ddc0" },
  "living-health": { emoji: "🌿", bg: "#dceadc" },
  family: { emoji: "🏠", bg: "#f0e7d4" },
  "work-money-retirement": { emoji: "💴", bg: "#e8e0c8" },
  meetups: { emoji: "🍻", bg: "#f0d9c0" },
};

export function ThreadThumbnail({
  media,
  categorySlug,
  categoryIcon,
  size = 64,
}: {
  media: MediaItem[] | null;
  categorySlug: string | null | undefined;
  // カテゴリ管理画面で設定したアイコン、最優先で使う。
  // 未指定なら旧 slug→emoji マップ、それも無ければ既定値（📌）。
  categoryIcon?: string | null;
  size?: number;
}) {
  // 最初の画像をサムネイル候補に
  const firstImage = (media ?? []).find((m) => m.type === "image");

  if (firstImage) {
    return (
      <Image
        src={getMediaUrl(firstImage.path)}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-lg object-cover bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }

  // フォールバック、カテゴリアイコン（ri-* または絵文字）プレースホルダー
  const slugLook = CATEGORY_LOOKS[categorySlug ?? ""];
  const iconValue = categoryIcon ?? slugLook?.emoji ?? "ri-bookmark-line";
  const bg = slugLook?.bg ?? "#e8e3d6";
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center rounded-lg text-foreground/70"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: size * 0.5,
      }}
    >
      <CategoryIcon icon={iconValue} />
    </span>
  );
}
