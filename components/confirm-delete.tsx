"use client";

import { useState } from "react";

// 「消す」の二段構え。
//
// もとは押した瞬間に消える作りだった。書いたものは取り返しがつかないので、
// 指が当たっただけで消えるのは重すぎる。とくにスマホでは、
// リアクションの並びのすぐ横に「消す」があるため、隣を押し間違えやすい。
//
// 確認をポップアップにしていないのは、この場所の方針による。
// 画面を覆う枠は、スマホのキーボードや戻るボタンと相性が悪く、
// 触っただけで閉じる。ここは文字を打たないので害は小さいものの、
// 同じ場所で作り方を揃えておいたほうが、迷いが少ない。
// その場で「消しますか？ はい／やめる」に化けるだけにしてある。
export function ConfirmDelete({
  label = "消す",
  question = "消しますか？",
}: {
  label?: string;
  question?: string;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-xs text-foreground/50 hover:text-notification underline-offset-2 hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs text-foreground/70">{question}</span>
      <button
        type="submit"
        className="min-h-[var(--spacing-tap)] px-3 rounded-full border border-notification text-xs font-bold text-notification hover:bg-notification hover:text-white transition-colors"
      >
        はい、消します
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="min-h-[var(--spacing-tap)] px-3 text-xs text-foreground/60 underline-offset-2 hover:underline"
      >
        やめる
      </button>
    </span>
  );
}
