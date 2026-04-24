"use client";

import { useRef, useState } from "react";
import {
  IMAGE_MIMES,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  VIDEO_MIMES,
} from "@/lib/media";

// 画像／動画ファイルの選択時に、サイズ・枚数・MIME を日本語メッセージで検証する。
// 素の <input type="file"> ではなく、ボタン風 UI で分かりやすく提示する。

function fmtMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export function MediaPicker() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [videoName, setVideoName] = useState<string | null>(null);

  function clearImages() {
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImageNames([]);
  }

  function clearVideo() {
    if (videoInputRef.current) videoInputRef.current.value = "";
    setVideoName(null);
  }

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) {
      clearImages();
      setError(null);
      return;
    }
    if (videoName) {
      setError("画像と動画は同時に添付できません。どちらか一方にしてください。");
      clearImages();
      return;
    }
    if (files.length > MAX_IMAGES_PER_POST) {
      setError(
        `画像は最大${MAX_IMAGES_PER_POST}枚までです。選び直してください（現在 ${files.length} 枚選択中）。`,
      );
      clearImages();
      return;
    }
    const wrongType = files.find((f) => !IMAGE_MIMES.includes(f.type));
    if (wrongType) {
      setError(
        `「${wrongType.name}」は対応していない形式です。JPEG・PNG・WebP・GIF のいずれかを選んでください。`,
      );
      clearImages();
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_IMAGE_SIZE);
    if (tooBig) {
      setError(
        `画像「${tooBig.name}」のサイズは ${fmtMb(tooBig.size)}MB で、上限の 5MB を超えています。もう少し小さい画像を選ぶか、スマホの設定で画像を縮小してから添付してください。`,
      );
      clearImages();
      return;
    }
    setError(null);
    setImageNames(files.map((f) => f.name));
  }

  function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      clearVideo();
      setError(null);
      return;
    }
    if (imageNames.length > 0) {
      setError("画像と動画は同時に添付できません。どちらか一方にしてください。");
      clearVideo();
      return;
    }
    if (!VIDEO_MIMES.includes(file.type)) {
      setError(
        `「${file.name}」は対応していない形式です。MP4 または MOV を選んでください。`,
      );
      clearVideo();
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError(
        `動画「${file.name}」のサイズは ${fmtMb(file.size)}MB で、上限の 50MB を超えています。もう少し短い動画や、画質を落として書き出した動画を添付してください。`,
      );
      clearVideo();
      return;
    }
    setError(null);
    setVideoName(file.name);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">
        添付（画像最大4枚 または 動画1本、任意）
      </legend>

      {/* 画像 */}
      <div className="space-y-1">
        <input
          ref={imageInputRef}
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImages}
          className="sr-only"
          id="media-picker-images"
        />
        <label
          htmlFor="media-picker-images"
          className="inline-flex items-center gap-2 min-h-[var(--spacing-tap)] px-4 rounded-full border border-border bg-background cursor-pointer hover:bg-muted/40 text-sm"
        >
          <span aria-hidden>📷</span>
          <span>画像を選ぶ（JPEG/PNG/WebP/GIF、5MB以下、最大4枚）</span>
        </label>
        {imageNames.length > 0 && (
          <div className="pl-1 text-xs text-foreground/70">
            <p>{imageNames.length} 枚を添付します、</p>
            <ul className="mt-1 space-y-0.5">
              {imageNames.map((name) => (
                <li key={name} className="truncate">・{name}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                clearImages();
                setError(null);
              }}
              className="mt-1 underline text-foreground/60 hover:text-foreground"
            >
              選択を取り消す
            </button>
          </div>
        )}
      </div>

      {/* 動画 */}
      <div className="space-y-1">
        <input
          ref={videoInputRef}
          type="file"
          name="video"
          accept="video/mp4,video/quicktime"
          onChange={handleVideo}
          className="sr-only"
          id="media-picker-video"
        />
        <label
          htmlFor="media-picker-video"
          className="inline-flex items-center gap-2 min-h-[var(--spacing-tap)] px-4 rounded-full border border-border bg-background cursor-pointer hover:bg-muted/40 text-sm"
        >
          <span aria-hidden>🎥</span>
          <span>動画を選ぶ（MP4/MOV、50MB以下、1本）</span>
        </label>
        {videoName && (
          <div className="pl-1 text-xs text-foreground/70">
            <p className="truncate">・{videoName}</p>
            <button
              type="button"
              onClick={() => {
                clearVideo();
                setError(null);
              }}
              className="mt-1 underline text-foreground/60 hover:text-foreground"
            >
              選択を取り消す
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded border border-red-700/50 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}
    </fieldset>
  );
}
