// 画面（クライアント）とサーバの両方から読む、写真まわりの定数だけを置く。
//
// lib/image-upload.ts には sharp と service_role の鍵が入っていて server-only
// なので、そこから定数を持ってくるとクライアント側のビルドが落ちる。
// 共有したい値はこちらに置く。

/** <input type="file"> の accept に出す値。iPhone の HEIC も受ける。 */
export const ACCEPT_ATTR =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** 受け取る側の上限（縮小前）。 */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** 保存後の長辺。老眼でも見える大きさと、通信量の折り合い。 */
export const MAX_EDGE = 1600;
