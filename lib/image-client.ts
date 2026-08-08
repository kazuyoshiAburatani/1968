// ブラウザ側で、送る前に写真を小さく焼き直す処理。
//
// サーバ側でも同じことをしている（lib/image-upload.ts）。二重にやる理由は三つ。
//
//  1. 送る前に軽くなる。いまのスマートフォンの写真は 1 枚 4〜8MB あり、
//     電波の弱い場所だと送信に十数秒かかって、その間に諦められてしまう。
//     ここで 300KB 前後に落としておけば、押してすぐ終わる。
//
//  2. iPhone の HEIC を JPEG に変える。HEIC はサーバ側の sharp が
//     開けないことがあるが、iPhone の Safari 自身は必ず開ける。
//     撮った端末で焼き直すのがいちばん確実。
//
//  3. 位置情報が端末から出ない。canvas に描き直した時点で Exif は残らないので、
//     緯度経度がそもそもネットワークに乗らない。
//
// ただし、これは速さと気遣いのための処理であって、安全のための処理ではない。
// ブラウザ側の処理は迂回できるので、位置情報を落とす保証はサーバ側が受け持つ。
// ここで失敗したときは、元のファイルをそのまま送ってサーバ側に任せる。

/** 焼き直したあとの長辺。サーバ側と揃えてある。 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

/** 画像を読み込む。Exif の向き情報を反映させてから描く。 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 古い Safari は imageOrientation を知らない。下の <img> 経路に回る。
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    return img;
  } finally {
    // 描画は同期的に終わるので、ここで解放してよい
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * 送る前に写真を縮小して JPEG に焼き直す。
 * うまくいかなかったときは、元のファイルをそのまま返す（サーバ側で処理する）。
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const src = await loadBitmap(file);
    const w = "width" in src ? src.width : 0;
    const h = "height" in src ? src.height : 0;
    if (!w || !h) return file;

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // 縮小時のがたつきを抑える
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // 透過 PNG を JPEG にすると背景が黒くなるので、先に白で塗る
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(src as CanvasImageSource, 0, 0, outW, outH);

    if ("close" in src && typeof src.close === "function") src.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size === 0) return file;

    // 焼き直したのに大きくなる場合（元が小さい JPEG のとき）は元のまま送る
    if (blob.size >= file.size && file.type === "image/jpeg") return file;

    return new File([blob], renameToJpg(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function renameToJpg(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.jpg`;
}
