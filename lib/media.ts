// 掲示板の添付メディアに関する共通型とユーティリティ。

export type MediaItem = {
  path: string; // post-media バケット内のパス（例 "uuid/abc.jpg"）
  type: "image" | "video";
  mime: string;
  size: number;
};

export const MAX_IMAGES_PER_POST = 4;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export const IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const VIDEO_MIMES = ["video/mp4", "video/quicktime"];

// Supabase Storage の公開 URL を組み立てる。バケットが public 前提。
export function getMediaUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/post-media/${path}`;
}

// ファイル名から拡張子を取り出す（安全なフォールバック付き）。
export function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return map[mime] ?? "bin";
}
