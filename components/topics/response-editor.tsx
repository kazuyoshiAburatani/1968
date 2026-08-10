"use client";

import { useState } from "react";
import { updateOwnResponse } from "@/app/topics/actions";
import { RichText } from "@/components/rich-text";
import { SubmitButton } from "@/components/submit-button";

// 自分が書いた回答を、その場で直す。
//
// なぜ必要か。
// これまでは削除しかなかった。スマホでの入力は誤字が出やすく、
// 直せないと分かると、次から書かなくなる。この年代では
// 「間違えたら消してもう一度書く」は面倒すぎて、黙る側に倒れる。
//
// なぜポップアップにしないか。
// 書き込みを独立したページに分けたときと同じ理由による。
// スマホのキーボードが出ると画面を覆う枠は隠れやすく、
// 枠の外に指が触れただけで閉じて、直しかけの文章が消える。
// ここはその場で入力欄に化けるだけにしてある。
//
// 「編集しました」という印は出していない。
// 誤字を直しただけの人に印が付くのは、ここでは重すぎる。
// 荒らしへの備えとしては、運営が消せることで足りる規模。
export function ResponseEditor({
  responseId,
  body,
  returnPath,
}: {
  responseId: string;
  body: string;
  returnPath: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div>
        <RichText text={body} />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1.5 text-xs text-foreground/50 hover:text-primary underline-offset-2 hover:underline"
        >
          直す
        </button>
      </div>
    );
  }

  return (
    <form action={updateOwnResponse} className="space-y-2">
      <input type="hidden" name="response_id" value={responseId} />
      <input type="hidden" name="return_path" value={returnPath} />
      <textarea
        name="body"
        defaultValue={body}
        rows={4}
        maxLength={1000}
        required
        autoFocus
        className="w-full resize-y rounded-lg border border-border bg-page px-3 py-2 text-base leading-8 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex items-center gap-3">
        <SubmitButton className="min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90">
          直す
        </SubmitButton>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="min-h-[var(--spacing-tap)] px-3 text-sm text-foreground/60 underline-offset-2 hover:underline"
        >
          やめる
        </button>
      </div>
      <p className="text-xs leading-6 text-foreground/60">
        写真を差し替えたいときは、一度消してから書き直してください。
      </p>
    </form>
  );
}
