"use client";

import { useState } from "react";
import { reportResponse } from "@/app/reports/actions";

// 違反報告ボタン。
// 押した瞬間に通報されるのではなく、理由を選ばせてから送る。
// 「荒れたら報告できる」と分かっていることが、慎重な人が読み書きを続ける前提になる。

const REASONS = [
  "宣伝・勧誘のように見える",
  "恋愛や交際の相手探しに見える",
  "政治・宗教・陰謀論の話題",
  "人を傷つける書き方",
  "個人情報が書かれている",
  "その他",
];

export function ReportButton({
  targetId,
  returnPath,
}: {
  targetId: string;
  returnPath: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-foreground/40 hover:text-foreground/70"
      >
        報告する
      </button>
    );
  }

  return (
    <form
      action={reportResponse}
      className="mt-2 rounded-xl border border-border bg-muted/40 p-3"
    >
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="return_path" value={returnPath} />
      <p className="text-xs font-bold">気になる点を選んでください</p>
      <div className="mt-2 space-y-1.5">
        {REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input type="radio" name="reason" value={r} required className="size-4" />
            <span>{r}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="min-h-[36px] px-4 rounded-full bg-notification text-white text-sm font-medium"
        >
          運営に知らせる
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[36px] px-4 rounded-full border border-border text-sm"
        >
          やめる
        </button>
      </div>
    </form>
  );
}
