"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

const ReplyInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(3000, "返信は3000文字以内でお願いします"),
});

async function uploadReplyMedia(
  formData: FormData,
  userId: string,
  supabase: Awaited<ReturnType<typeof requireSession>>["supabase"],
): Promise<{ media: MediaItem[] } | { error: string }> {
  const imageFiles = formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0);
  const videoFile =
    formData.get("video") instanceof File && (formData.get("video") as File).size > 0
      ? (formData.get("video") as File)
      : null;

  if (imageFiles.length > 0 && videoFile) {
    return { error: "画像と動画は同時に添付できません" };
  }
  if (imageFiles.length > MAX_IMAGES_PER_POST) {
    return { error: `画像は最大${MAX_IMAGES_PER_POST}枚までです` };
  }
  for (const f of imageFiles) {
    if (!IMAGE_MIMES.includes(f.type)) return { error: "対応していない画像形式です" };
    if (f.size > MAX_IMAGE_SIZE) return { error: "画像サイズが大きすぎます（上限5MB）" };
  }
  if (videoFile) {
    if (!VIDEO_MIMES.includes(videoFile.type)) return { error: "対応していない動画形式です" };
    if (videoFile.size > MAX_VIDEO_SIZE) return { error: "動画サイズが大きすぎます（上限50MB）" };
  }

  const uploaded: MediaItem[] = [];
  const files: Array<{ file: File; type: "image" | "video" }> = [
    ...imageFiles.map((f) => ({ file: f, type: "image" as const })),
    ...(videoFile ? [{ file: videoFile, type: "video" as const }] : []),
  ];

  for (const { file, type } of files) {
    const path = `${userId}/${crypto.randomUUID()}.${getExtensionFromMime(file.type)}`;
    const { error } = await supabase.storage
      .from("post-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[createReply] upload failed:", error.message);
      return { error: "メディアのアップロードに失敗しました" };
    }
    uploaded.push({ path, type, mime: file.type, size: file.size });
  }

  return { media: uploaded };
}

export async function createReply(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const threadId = String(formData.get("thread_id") ?? "");
  const parentReplyIdRaw = formData.get("parent_reply_id");
  const parentReplyId =
    typeof parentReplyIdRaw === "string" && parentReplyIdRaw !== ""
      ? parentReplyIdRaw
      : null;

  if (!slug || !threadId) {
    redirect("/board");
  }

  const parsed = ReplyInputSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(`/board/${slug}/${threadId}?error=${encodeURIComponent(first.message)}`);
  }

  const { supabase, user } = await requireSession();

  const mediaResult = await uploadReplyMedia(formData, user.id, supabase);
  if ("error" in mediaResult) {
    redirect(`/board/${slug}/${threadId}?error=${encodeURIComponent(mediaResult.error)}`);
  }

  const { error: insertError } = await supabase.from("replies").insert({
    thread_id: threadId,
    user_id: user.id,
    body: parsed.data.body,
    media: mediaResult.media,
    parent_reply_id: parentReplyId,
  });

  if (insertError) {
    console.error("[createReply] insert failed:", insertError.message);
    redirect(
      `/board/${slug}/${threadId}?error=${encodeURIComponent("返信の投稿に失敗しました、時間をおいてお試しください")}`,
    );
  }

  revalidatePath(`/board/${slug}/${threadId}`);
  revalidatePath(`/board/${slug}`);
  redirect(`/board/${slug}/${threadId}`);
}
