"use client";

import { useRef, useState, useTransition } from "react";
import {
  removeAvatar,
  uploadAvatar,
} from "@/app/(members)/mypage/profile/actions";

// マイページに表示するアバター変更ボタン。
// 画像を選んだ瞬間にフォーム送信、シニアでも 1 タップで完了する設計。
// 削除は別アクションのボタンで明示。

export function AvatarUploader({ hasAvatar }: { hasAvatar: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    setError(null);
    const fd = new FormData();
    fd.set("avatar", e.target.files[0]);
    startTransition(async () => {
      try {
        await uploadAvatar(fd);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NEXT_REDIRECT")) return;
        setError("アップロードに失敗しました。時間をおいてお試しください。");
      }
    });
  }

  function onRemove() {
    startTransition(async () => {
      try {
        await removeAvatar();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NEXT_REDIRECT")) return;
        setError("削除に失敗しました");
      }
    });
  }

  return (
    <>
      <form
        ref={formRef}
        encType="multipart/form-data"
        className="flex items-center gap-2 flex-wrap"
        onSubmit={(e) => e.preventDefault()}
      >
        <label
          className={`inline-flex items-center gap-2 min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white font-medium cursor-pointer text-sm ${pending ? "opacity-60 cursor-wait" : "active:opacity-90"}`}
        >
          <i className="ri-camera-line text-base" aria-hidden />
          <span>
            {pending
              ? "保存中…"
              : hasAvatar
                ? "写真を変更"
                : "写真を入れる"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onChange}
            disabled={pending}
            className="sr-only"
          />
        </label>
        {hasAvatar && (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm hover:bg-muted active:bg-muted/70 disabled:opacity-50"
          >
            削除
          </button>
        )}
      </form>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </>
  );
}
