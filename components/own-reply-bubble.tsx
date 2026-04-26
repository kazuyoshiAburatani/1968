"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RichText } from "@/components/rich-text";
import { MediaDisplay } from "@/components/media-display";
import { updateReplyBody } from "@/app/actions/reply";
import type { MediaItem } from "@/lib/media";

// 自分の返信バブル、表示中は通常バブル + meta 行に「✏ 編集」ピル、
// 編集中はバブルが textarea + 保存／キャンセルに置き換わる。

type Props = {
  replyId: string;
  body: string;
  media: MediaItem[];
  pathToRevalidate: string;
  metaRow: React.ReactNode; // 時刻といいねを含む下部の行
};

export function OwnReplyBubble({
  replyId,
  body,
  media,
  pathToRevalidate,
  metaRow,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
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

  if (editing) {
    return (
      <div className="w-full max-w-[80%] ml-auto">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={3000}
          rows={4}
          autoFocus
          className="w-full px-3 py-2 rounded-2xl border border-border bg-background text-sm leading-7"
        />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
              setDraft(body);
            }}
            className="min-h-[36px] px-3 rounded-full border border-border text-xs"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending || !draft.trim()}
            className="min-h-[36px] px-4 rounded-full bg-primary text-white text-xs font-medium active:opacity-90 disabled:opacity-50"
          >
            {pending ? "保存中…" : "保存する"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <div className="rounded-2xl px-4 py-2.5 leading-7 text-sm whitespace-pre-wrap bg-primary text-white rounded-br-sm">
        <RichText text={body} />
        {media && media.length > 0 && (
          <div className="mt-2">
            <MediaDisplay items={media} />
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-foreground/50">
        {metaRow}
        <button
          type="button"
          onClick={() => {
            setDraft(body);
            setEditing(true);
          }}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-border bg-background hover:bg-muted text-foreground/70"
          aria-label="編集"
        >
          <i className="ri-pencil-line text-[11px]" aria-hidden />
          <span>編集</span>
        </button>
      </div>
    </div>
  );
}
