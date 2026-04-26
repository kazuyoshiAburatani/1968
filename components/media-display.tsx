import { getMediaUrl, type MediaItem } from "@/lib/media";

// 投稿に添付されたメディアを描画する共通コンポーネント。
// 画像は元の縦横比を保ったまま幅 100% に合わせ、横長は横一杯、
// 縦長はそのまま（ただし画面の見やすさを保つため最大高を viewport の 80% に制限）。
// 動画も同様に幅優先、最大高 80vh。
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
          className="w-full max-h-[80vh] rounded border border-border bg-black object-contain"
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
          className="block bg-muted/30 rounded border border-border overflow-hidden"
        >
          {/* next/image 向けの remotePatterns が未設定のため通常の img タグを利用 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getMediaUrl(img.path)}
            alt=""
            className="w-full h-auto max-h-[70vh] object-contain mx-auto"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
