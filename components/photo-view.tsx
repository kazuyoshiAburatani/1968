import Image from "next/image";

// 投稿に添えられた写真を出すところ。
//
// 大きさについて。
// 57・58 歳が見る画面なので、切手のように小さく出しても意味が無い。
// かといって縦長の写真を原寸で流すと、下にある会話が押し出されて読まれなくなる。
// 高さの上限を決めて、その中に収める形にしてある。
//
// 拡大について。
// 押したら大きく見たい、は必ず出る要望だが、モーダルは開いたら閉じ方が分からず、
// 「戻れなくなった」という詰まり方をする層がいる。ここでは新しいタブで元の画像を
// 開くだけにしてある。戻るボタンで必ず戻れる。

type Props = {
  /** Storage の公開 URL */
  url: string;
  /** 保存時に測った大きさ。0 のときは比率を決め打ちにする */
  width?: number;
  height?: number;
  /** 読み上げ用の説明 */
  alt?: string;
  className?: string;
};

/** 収める枠。高さはここまで。 */
const BOX_W = 640;
const BOX_H = 420;

export function PhotoView({
  url,
  width = 0,
  height = 0,
  alt = "投稿に添えられた写真",
  className = "",
}: Props) {
  // 保存時に大きさを測れていれば、それに合わせて枠を用意する。
  // 用意しておくと、読み込みの途中で下の文章が飛び跳ねない。
  const known = width > 0 && height > 0;
  const scale = known ? Math.min(BOX_W / width, BOX_H / height, 1) : 1;
  const w = known ? Math.round(width * scale) : BOX_W;
  const h = known ? Math.round(height * scale) : Math.round(BOX_W * 0.68);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "group relative block w-fit max-w-full overflow-hidden rounded-xl border border-border/70 bg-muted/30 no-underline " +
        className
      }
    >
      <Image
        src={url}
        alt={alt}
        width={w}
        height={h}
        sizes="(max-width: 640px) 92vw, 640px"
        className="h-auto w-full max-h-[420px] object-contain"
      />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        大きく見る
      </span>
    </a>
  );
}
