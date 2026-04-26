"use client";

import { useRef, useState } from "react";
import { IMAGE_MIMES, MAX_IMAGE_SIZE } from "@/lib/media";

const MAX_IMAGES = 4;

// DM 用の画像添付ピッカー、コンパクトな丸ボタン。
// クリックで隠しファイル input を発火、選択した画像名を簡単にプレビュー。
export function DmMediaPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setError(null);

    if (list.length > MAX_IMAGES) {
      setError(`画像は最大 ${MAX_IMAGES} 枚までです`);
      if (inputRef.current) inputRef.current.value = "";
      setFiles([]);
      return;
    }
    for (const f of list) {
      if (!IMAGE_MIMES.includes(f.type)) {
        setError(`「${f.name}」は対応していない形式です`);
        if (inputRef.current) inputRef.current.value = "";
        setFiles([]);
        return;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        setError(`「${f.name}」は 5 MB を超えています`);
        if (inputRef.current) inputRef.current.value = "";
        setFiles([]);
        return;
      }
    }
    setFiles(list);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setFiles([]);
    setError(null);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name="images"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="sr-only"
        id="dm-image-input"
      />
      <label
        htmlFor="dm-image-input"
        aria-label="画像を添付"
        className="shrink-0 inline-flex items-center justify-center size-10 rounded-full border border-border bg-background hover:bg-muted active:bg-muted/70 cursor-pointer text-foreground/70"
        title="画像を添付（最大 4 枚、5 MB 以下）"
      >
        <i className="ri-image-add-line text-lg" aria-hidden />
      </label>
      {(files.length > 0 || error) && (
        <span
          aria-live="polite"
          className="absolute -top-7 left-3 right-3 text-xs flex items-center gap-2 flex-wrap"
        >
          {error ? (
            <span className="text-red-700">{error}</span>
          ) : (
            <>
              <span className="text-foreground/70 bg-background/95 px-2 py-0.5 rounded">
                📷 {files.length} 枚を添付
              </span>
              <button
                type="button"
                onClick={clear}
                className="underline text-foreground/60"
              >
                取り消す
              </button>
            </>
          )}
        </span>
      )}
    </>
  );
}
