"use client";

import { useState } from "react";

// 人に渡すためのボタン。
//
// なぜ要るか。
// 年表と検定は、検証で「拡散装置」と位置づけた 2 つ（初回参加 8.0 と 7.0）。
// 人に見せたくなる、自分ごとの結果を返すことが役割だった。
// ところが、見せるための手段が画面のどこにも無かった。
// 渡す先が無い拡散装置は、ただの一人遊びになる。
//
// この年代の会員が増える一番安い道は、会員が同級生を連れてくることで、
// 広告で買える人数には限りがある。ここが動くかどうかで、
// 1 人あたりの獲得費用が何倍も変わる。
//
// なぜ LINE を先頭に置くか。
// 同じ年代（50代）の利用率が、LINE は 9 割超、Instagram や X は 3 割前後。
// 「送る」といえば LINE の年代なので、他の選択肢を先に並べても押されない。
//
// 文言について。
// 「シェア」ではなく「送る」。同級生ひとりに手渡す感覚に寄せる。
// 「拡散」「拡げる」のような、宣伝を手伝わせる言い方はしない。

type Props = {
  /** 送り先のページ。受け取った人が自分の分を作れる場所にする */
  url: string;
  /** 送る文面。自分の結果を一言で */
  text: string;
  /** 見出し */
  label?: string;
};

export function ShareRow({
  url,
  text,
  label = "この結果を、同級生に送る",
}: Props) {
  const [copied, setCopied] = useState(false);

  const lineHref =
    "https://social-plugins.line.me/lineit/share?url=" +
    encodeURIComponent(url) +
    "&text=" +
    encodeURIComponent(text);

  // 端末が持っている共有画面を開く。スマートフォンならこれが一番速い。
  // 使えない端末（多くのパソコン）では、この関数は呼ばれない。
  async function shareNative() {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({ title: "1968.LOVE", text, url });
    } catch {
      // 途中でやめただけなので、何も言わない
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // クリップボードが使えない環境。文面は画面に出ているので、それを写してもらう
    }
  }

  const canShareNative =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-5">
      <p className="text-center text-base leading-8 text-foreground/80">
        {label}
      </p>

      <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center">
        <a
          href={lineHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-full bg-[#06C755] text-white text-base font-bold no-underline hover:opacity-90"
        >
          <i className="ri-line-fill text-xl" aria-hidden />
          LINEで送る
        </a>

        {canShareNative && (
          <button
            type="button"
            onClick={shareNative}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-full border-2 border-primary text-primary text-base font-bold hover:bg-primary hover:text-white transition-colors"
          >
            <i className="ri-share-line text-xl" aria-hidden />
            ほかで送る
          </button>
        )}

        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-full border border-border text-base text-foreground/75 hover:border-primary hover:text-primary transition-colors"
        >
          <i
            className={copied ? "ri-check-line text-xl" : "ri-link text-xl"}
            aria-hidden
          />
          {copied ? "写しました" : "リンクを写す"}
        </button>
      </div>

      <p className="mt-3 text-center text-xs leading-6 text-foreground/60">
        送った相手も、自分の生まれた日で同じものが作れます。
      </p>
    </section>
  );
}
