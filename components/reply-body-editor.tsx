"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RichText } from "@/components/rich-text";
import { updateReplyBody } from "@/app/actions/reply";

// 本人の返信に「編集」ボタンを添え、クリックで本文を textarea に切り替えるインライン編集。
// 保存すると Server Action が走り、ページ全体を router.refresh() で最新化する。
export function ReplyBodyEditor({
  replyId,
  initialBody,
  pathToRevalidate,
}: {
  replyId: string;
  initialBody: string;
  pathToRevalidate: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateReplyBody({
        replyId,
        body: draft,
        pathToRevalidate,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div>
        <RichText text={initialBody} />
        <button
          type="button"
          onClick={() => {
            setDraft(initialBody);
            setEditing(true);
          }}
          className="mt-2 text-xs text-foreground/50 hover:text-foreground/80 underline"
        >
          編集
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={3000}
        rows={5}
        className="w-full px-3 py-2 rounded border border-border bg-background"
      />
      {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !draft.trim()}
          className="min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存する"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
