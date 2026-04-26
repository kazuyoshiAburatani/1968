// Supabase Storage の profile-avatars バケットは public のため、URL を組み立てて表示できる。
// avatar_url 列は "user_id/uuid.ext" のパスを保存し、
// 配信時に publicAvatarUrl(path) で完全 URL を組む。

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "profile-avatars";

export function publicAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export function avatarExtensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}
