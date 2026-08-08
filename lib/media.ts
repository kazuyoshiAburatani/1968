// 投稿に添えられた写真まわりの共通の型とユーティリティ。
//
// 動画は扱わない。掲示板があった頃は受け付けていたが、いま動画を置く場所は無く、
// 公開バケットに 50MB のファイルを受け入れる口だけが残っていたので閉じた
// （移行 20260808000000）。

export type MediaItem = {
  /** post-media バケット内のパス（例 "uuid/abc.jpg"） */
  path: string;
  width: number;
  height: number;
};

/** 1 投稿に添えられる枚数。1 枚に絞ってある（下の注記を参照）。 */
export const MAX_IMAGES_PER_POST = 1;

/** 受け取る側の上限。この先で長辺 1600px に縮小する。 */
export const MAX_IMAGE_SIZE = 12 * 1024 * 1024;

export const IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// 枚数を 1 枚に絞っている理由。
// 複数枚にすると、選ぶ・並べる・消すの操作が要る。老眼が始まっていて、
// スマートフォンの細かい操作を面倒に感じる層にとって、その一手間で投稿が止まる。
// 「1 枚だけ」と決まっていれば、選んだら終わりで、迷う余地がない。
// 何枚も見せたい人が出てきたら、そのとき増やせばよい。

/** Supabase Storage の公開 URL を組み立てる。両バケットとも public。 */
export function getMediaUrl(
  path: string,
  bucket: "post-media" | "poll-media" = "post-media",
): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/** 二択の選択肢に添えられた写真の URL。 */
export function pollImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return getMediaUrl(path, "poll-media");
}

/** 投稿に添えられた写真の URL。 */
export function postImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return getMediaUrl(path, "post-media");
}

/** jsonb で持っている media 列を、扱える形に直す。古い形式の行も拾えるようにしておく。 */
export function parseMedia(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return [];
  const items: MediaItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (typeof o.path !== "string" || o.path.length === 0) continue;
    // 掲示板時代の行には width/height が無く、type/mime/size が入っている。
    // 大きさが分からないときは 0 を入れておき、表示側で比率を決め打ちにする。
    if (o.type === "video") continue; // 動画はもう出さない
    items.push({
      path: o.path,
      width: typeof o.width === "number" ? o.width : 0,
      height: typeof o.height === "number" ? o.height : 0,
    });
  }
  return items.slice(0, MAX_IMAGES_PER_POST);
}
