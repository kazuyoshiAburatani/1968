import "server-only";
import sharp from "sharp";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_EDGE, MAX_UPLOAD_BYTES } from "@/lib/image-accept";

// 投稿された写真を受け取って保存するところ。
//
// 写真を扱えるようにすると、文章だけのときには無かった問題が三つ出てくる。
// ここで全部片づけてから保存する。
//
//  1. 位置情報。スマートフォンで撮った写真には、撮影した場所の緯度経度と
//     日時が埋まっている。実家の押し入れで撮った下敷きの写真から自宅が割れる。
//     57・58 歳の、家族と暮らしている人が多い場に、これを素通りさせられない。
//     → sharp で再エンコードする。sharp は既定でメタデータを引き継がないので、
//       Exif も GPS も、この一手で消える。画面にもその旨を書く。
//
//  2. 大きさ。いまのスマートフォンは 1 枚 4〜8MB になる。そのまま並べると
//     通信量の多い人・電波の弱い場所の人から順に読めなくなる。
//     → 長辺 1600px に収め、JPEG で焼き直す。だいたい 200〜400KB に落ちる。
//
//  3. 中身の詐称。拡張子や Content-Type は送る側が自由に名乗れるので、
//     .jpg と名乗った別の何かを置ける。
//     → 先頭バイトを見て画像であることを確かめ、さらに sharp に実際に
//       デコードさせる。デコードできないものはここで落ちる。
//
// 保存はすべて service_role で行う。ブラウザから Storage へ直接置く口は
// 移行 20260808000000 で塞いであるので、経路はここ一本になる。

export type StoredImage = { path: string; width: number; height: number };
export type UploadResult =
  | { ok: true; image: StoredImage }
  | { ok: false; message: string };

/**
 * 先頭バイトで画像かどうかを確かめる。
 * 拡張子と Content-Type は当てにならないので、実体を見る。
 */
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return true;
  // WebP: "RIFF" .... "WEBP"
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return true;
  // HEIC / HEIF: ....ftyp
  if (buf.toString("ascii", 4, 8) === "ftyp") return true;
  return false;
}

/**
 * 写真 1 枚を、位置情報を落として縮小したうえで Storage に保存する。
 *
 * @param file    フォームから届いたファイル
 * @param bucket  保存先バケット
 * @param folder  バケット内の第 1 階層。投稿写真は user_id、選択肢の写真は poll_id を使う
 */
export async function storeImage(
  file: File,
  bucket: "post-media" | "poll-media",
  folder: string,
): Promise<UploadResult> {
  if (file.size === 0) {
    return { ok: false, message: "写真を読み取れませんでした" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "写真が大きすぎます（12MBまで）" };
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(input)) {
    return { ok: false, message: "画像として読み取れないファイルでした" };
  }

  // ここが位置情報を落とす処理そのもの。
  //  ・rotate() を引数なしで呼ぶと、Exif の向き情報を見て回してから情報を捨てる。
  //    これをしないと、縦で撮った写真が横倒しで出る。
  //  ・jpeg() で焼き直した時点で、元の Exif・GPS・撮影日時はすべて落ちる。
  //    sharp は明示的に withMetadata() を呼ばない限りメタデータを引き継がない。
  let output: Buffer;
  let width: number;
  let height: number;
  try {
    const result = await sharp(input, { failOn: "error" })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    output = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch (e) {
    // HEIC はビルドによっては sharp が開けない。その場合ここに来る。
    // 画面側でいったん JPEG に焼き直してから送っているので通常は起きないが、
    // 起きたときに何が悪いのか分かる文言を返す。
    console.error("[image-upload] decode failed:", (e as Error).message);
    return {
      ok: false,
      message:
        "この形式の写真は読み取れませんでした。写真アプリで一度保存し直してからお試しください。",
    };
  }

  // ファイル名は当てられない値にする。パスが読まれても、他人の写真は辿れない。
  const name = `${crypto.randomUUID()}.jpg`;
  const path = `${folder}/${name}`;

  const admin = getSupabaseAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, output, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[image-upload] upload failed:", error.message);
    return { ok: false, message: "写真を保存できませんでした" };
  }

  return { ok: true, image: { path, width, height } };
}

/** 保存済みの写真を消す。消せなくても投稿の削除自体は続ける（best effort）。 */
export async function removeImage(
  bucket: "post-media" | "poll-media",
  path: string | null | undefined,
): Promise<void> {
  if (!path) return;
  const admin = getSupabaseAdminClient();
  const { error } = await admin.storage.from(bucket).remove([path]);
  if (error) console.error("[image-upload] remove failed:", error.message);
}

/** フォームの値がファイルとして中身を持っているか。空の input は size 0 で届く。 */
export function hasFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
