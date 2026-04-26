"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import {
  IMAGE_MIMES,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  VIDEO_MIMES,
  getExtensionFromMime,
  type MediaItem,
} from "@/lib/media";

// スレッド編集、title / body / media（追加・削除）を更新可能。
// 削除は別 Action。

const ThreadUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "件名を入力してください")
    .max(100, "件名は100文字以内でお願いします"),
  body: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内でお願いします"),
});

export async function updateThread(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const threadId = String(formData.get("thread_id") ?? "");
  if (!slug || !threadId) redirect("/board");

  const parsed = ThreadUpdateSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(
      `/board/${slug}/${threadId}/edit?error=${encodeURIComponent(first.message)}`,
    );
  }

  const { supabase, user } = await requireSession();

  // 現在のメディアを取得
  const { data: current } = await supabase
    .from("threads")
    .select("media, user_id")
    .eq("id", threadId)
    .maybeSingle();
  if (!current || current.user_id !== user.id) {
    redirect(`/board/${slug}/${threadId}/edit?error=${encodeURIComponent("編集権限がありません")}`);
  }
  const existingMedia = ((current.media as MediaItem[] | null) ?? []) as MediaItem[];

  // 削除対象のパスを取得
  const removedPaths = formData
    .getAll("remove_media")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  // 新規アップロード対象を取得
  const imageFiles = formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0);
  const videoFile =
    formData.get("video") instanceof File &&
    (formData.get("video") as File).size > 0
      ? (formData.get("video") as File)
      : null;

  // バリデーション
  if (imageFiles.length > 0 && videoFile) {
    redirect(
      `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("画像と動画は同時に添付できません")}`,
    );
  }
  for (const f of imageFiles) {
    if (!IMAGE_MIMES.includes(f.type)) {
      redirect(
        `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("対応していない画像形式です")}`,
      );
    }
    if (f.size > MAX_IMAGE_SIZE) {
      redirect(
        `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("画像サイズが大きすぎます（5 MB 以下）")}`,
      );
    }
  }
  if (videoFile) {
    if (!VIDEO_MIMES.includes(videoFile.type)) {
      redirect(
        `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("対応していない動画形式です")}`,
      );
    }
    if (videoFile.size > MAX_VIDEO_SIZE) {
      redirect(
        `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("動画サイズが大きすぎます（50 MB 以下）")}`,
      );
    }
  }

  // 新規アップロード
  const uploaded: MediaItem[] = [];
  const filesToUpload: Array<{ file: File; type: "image" | "video" }> = [
    ...imageFiles.map((f) => ({ file: f, type: "image" as const })),
    ...(videoFile ? [{ file: videoFile, type: "video" as const }] : []),
  ];
  for (const { file, type } of filesToUpload) {
    const ext = getExtensionFromMime(file.type);
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("post-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[updateThread/upload]", error.message);
      // 既にアップロード済みのものをロールバック
      if (uploaded.length > 0) {
        await supabase.storage
          .from("post-media")
          .remove(uploaded.map((m) => m.path));
      }
      redirect(
        `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("画像のアップロードに失敗しました")}`,
      );
    }
    uploaded.push({ path, type, mime: file.type, size: file.size });
  }

  // 新しい media 配列を組み立て、（既存 - 削除対象） ＋ 新規
  const keptMedia = existingMedia.filter((m) => !removedPaths.includes(m.path));
  const totalImages =
    keptMedia.filter((m) => m.type === "image").length +
    uploaded.filter((m) => m.type === "image").length;
  if (totalImages > MAX_IMAGES_PER_POST) {
    // ロールバック
    if (uploaded.length > 0) {
      await supabase.storage
        .from("post-media")
        .remove(uploaded.map((m) => m.path));
    }
    redirect(
      `/board/${slug}/${threadId}/edit?error=${encodeURIComponent(`画像は最大${MAX_IMAGES_PER_POST}枚までです`)}`,
    );
  }
  const newMedia = [...keptMedia, ...uploaded];

  const { error } = await supabase
    .from("threads")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      media: newMedia,
    })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[updateThread] failed:", error.message);
    if (uploaded.length > 0) {
      await supabase.storage
        .from("post-media")
        .remove(uploaded.map((m) => m.path));
    }
    redirect(
      `/board/${slug}/${threadId}/edit?error=${encodeURIComponent("更新に失敗しました、時間をおいてお試しください")}`,
    );
  }

  // 削除されたメディアファイルを Storage からも削除
  if (removedPaths.length > 0) {
    await supabase.storage.from("post-media").remove(removedPaths);
  }

  revalidatePath(`/board/${slug}/${threadId}`);
  revalidatePath(`/board/${slug}`);
  redirect(`/board/${slug}/${threadId}`);
}

// スレッド削除は運営のみ可能とする方針に変更（2026-04-26）。
// 投稿者本人の削除はサポート（support@1968.love）で受け付け、
// 運営が /admin/reports や /board/[slug]/[thread] の運営ツールバーから削除する。
