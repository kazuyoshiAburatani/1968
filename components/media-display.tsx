import { getMediaUrl, type MediaItem } from "@/lib/media";

// 投稿に添付されたメディアを描画する共通コンポーネント。
// 画像は最大4枚のグリッド、動画は1本の HTML video プレイヤー。
export function MediaDisplay({ items }: { items: MediaItem[] }) {
  if (!items || items.length === 0) return null;

  const video = items.find((m) => m.type === "video");
  if (video) {
    return (
      <div className="mt-4">
        <video
          src={getMediaUrl(video.path)}
          controls
          preload="metadata"
          className="w-full max-h-[480px] rounded border border-border bg-black"
        />
      </div>
    );
  }

  const images = items.filter((m) => m.type === "image");
  if (images.length === 0) return null;

  return (
    <div
      className={
        "mt-4 grid gap-2 " +
        (images.length === 1 ? "grid-cols-1" : "grid-cols-2")
      }
    >
      {images.map((img, i) => (
        <a
          key={i}
          href={getMediaUrl(img.path)}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {/* next/image 向けの remotePatterns が未設定のため通常の img タグを利用 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getMediaUrl(img.path)}
            alt=""
            className="w-full h-auto rounded border border-border object-cover aspect-square"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
