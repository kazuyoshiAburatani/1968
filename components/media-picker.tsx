"use client";

import { useState } from "react";
import {
  IMAGE_MIMES,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  VIDEO_MIMES,
} from "@/lib/media";

// 画像／動画ファイルの選択時に、サイズ・枚数・MIME を日本語メッセージで検証する。
// サーバ側でも同等チェックがあるが、ここで事前に弾いて UX を改善する。

function fmtMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export function MediaPicker() {
  const [error, setError] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [videoName, setVideoName] = useState<string | null>(null);

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) {
      setImageCount(0);
      setError(null);
      return;
    }
    if (videoName) {
      setError("画像と動画は同時に添付できません。どちらか一方にしてください。");
      e.target.value = "";
      setImageCount(0);
      return;
    }
    if (files.length > MAX_IMAGES_PER_POST) {
      setError(
        `画像は最大${MAX_IMAGES_PER_POST}枚までです。選び直してください（現在 ${files.length} 枚選択中）。`,
      );
      e.target.value = "";
      setImageCount(0);
      return;
    }
    const wrongType = files.find((f) => !IMAGE_MIMES.includes(f.type));
    if (wrongType) {
      setError(
        `「${wrongType.name}」は対応していない形式です。JPEG・PNG・WebP・GIF のいずれかを選んでください。`,
      );
      e.target.value = "";
      setImageCount(0);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_IMAGE_SIZE);
    if (tooBig) {
      setError(
        `画像「${tooBig.name}」のサイズは ${fmtMb(tooBig.size)}MB で、上限の 5MB を超えています。もう少し小さい画像を選ぶか、スマホの設定で画像を縮小してから添付してください。`,
      );
      e.target.value = "";
      setImageCount(0);
      return;
    }
    setError(null);
    setImageCount(files.length);
  }

  function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setVideoName(null);
      setError(null);
      return;
    }
    if (imageCount > 0) {
      setError("画像と動画は同時に添付できません。どちらか一方にしてください。");
      e.target.value = "";
      setVideoName(null);
      return;
    }
    if (!VIDEO_MIMES.includes(file.type)) {
      setError(
        `「${file.name}」は対応していない形式です。MP4 または MOV を選んでください。`,
      );
      e.target.value = "";
      setVideoName(null);
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError(
        `動画「${file.name}」のサイズは ${fmtMb(file.size)}MB で、上限の 50MB を超えています。もう少し短い動画や、画質を落として書き出した動画を添付してください。`,
      );
      e.target.value = "";
      setVideoName(null);
      return;
    }
    setError(null);
    setVideoName(file.name);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">添付（画像最大4枚 または 動画1本）</legend>
      <label className="block text-sm">
        <span className="block mb-1 text-[color:var(--color-foreground)]/70">
          画像（JPEG / PNG / WebP / GIF、1枚あたり 5MB 以下、最大 4 枚）
        </span>
        <input
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImages}
          className="block w-full text-sm"
        />
        {imageCount > 0 && (
          <span className="block mt-1 text-xs text-[color:var(--color-foreground)]/60">
            {imageCount} 枚を添付します
          </span>
        )}
      </label>
      <label className="block text-sm">
        <span className="block mb-1 text-[color:var(--color-foreground)]/70">
          または動画 1 本（MP4 / MOV、50MB 以下）
        </span>
        <input
          type="file"
          name="video"
          accept="video/mp4,video/quicktime"
          onChange={handleVideo}
          className="block w-full text-sm"
        />
        {videoName && (
          <span className="block mt-1 text-xs text-[color:var(--color-foreground)]/60">
            {videoName} を添付します
          </span>
        )}
      </label>
      {error && (
        <p className="rounded border border-red-700/50 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}
    </fieldset>
  );
}
