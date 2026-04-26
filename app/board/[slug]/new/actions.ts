"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import {
  canCreateThread,
  type Rank,
  type PostLevel,
} from "@/lib/auth/permissions";
import {
  IMAGE_MIMES,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  VIDEO_MIMES,
  getExtensionFromMime,
  type MediaItem,
} from "@/lib/media";

const ThreadInputSchema = z.object({
  title: z.string().trim().min(1, "件名を入力してください").max(100, "件名は100文字以内でお願いします"),
  body: z.string().trim().min(1, "本文を入力してください").max(5000, "本文は5000文字以内でお願いします"),
});

async function validateAndUploadMedia(
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
    return { error: "画像と動画は同時に添付できません、どちらか一方にしてください" };
  }
  // 新規スレッドは画像（または動画）が必須、関連画像をサムネイルとして表示する
  if (imageFiles.length === 0 && !videoFile) {
    return {
      error: "話題に合う画像を 1 枚以上添付してください、サムネイルとして表示されます",
    };
  }
  if (imageFiles.length > MAX_IMAGES_PER_POST) {
    return { error: `画像は最大${MAX_IMAGES_PER_POST}枚までです` };
  }
  for (const f of imageFiles) {
    if (!IMAGE_MIMES.includes(f.type)) {
      return { error: `対応していない画像形式です、${f.type}` };
    }
    if (f.size > MAX_IMAGE_SIZE) {
      return { error: `画像サイズが大きすぎます（上限5MB）` };
    }
  }
  if (videoFile) {
    if (!VIDEO_MIMES.includes(videoFile.type)) {
      return { error: `対応していない動画形式です、${videoFile.type}` };
    }
    if (videoFile.size > MAX_VIDEO_SIZE) {
      return { error: `動画サイズが大きすぎます（上限50MB）` };
    }
  }

  const uploaded: MediaItem[] = [];
  const files: Array<{ file: File; type: "image" | "video" }> = [
    ...imageFiles.map((file) => ({ file, type: "image" as const })),
    ...(videoFile ? [{ file: videoFile, type: "video" as const }] : []),
  ];

  for (const { file, type } of files) {
    const ext = getExtensionFromMime(file.type);
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("post-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[createThread] upload failed:", error.message);
      return { error: "メディアのアップロードに失敗しました" };
    }
    uploaded.push({
      path,
      type,
      mime: file.type,
      size: file.size,
    });
  }

  return { media: uploaded };
}

export async function createThread(formData: FormData) {
  const slug = formData.get("slug");
  if (typeof slug !== "string" || slug === "") {
    redirect("/board");
  }

  const parsed = ThreadInputSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(`/board/${slug}/new?error=${encodeURIComponent(first.message)}`);
  }

  const { supabase, user } = await requireSession();

  const { data: publicUser } = await supabase
    .from("users")
    .select("membership_rank")
    .eq("id", user.id)
    .maybeSingle();
  const rank = (publicUser?.membership_rank ?? "pending") as Rank;

  const { data: category } = await supabase
    .from("categories")
    .select("id, slug, access_level_post, posting_limit_per_day")
    .eq("slug", slug)
    .maybeSingle();
  if (!category) {
    redirect("/board");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: todayCount } = await supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("category_id", category.id)
    .gte("created_at", since);

  const check = canCreateThread({
    rank,
    accessLevelPost: category.access_level_post as PostLevel,
    postingLimitPerDay: category.posting_limit_per_day as number | null,
    threadCountToday: todayCount ?? 0,
  });
  if (!check.ok) {
    redirect(`/board/${slug}/new?error=${encodeURIComponent(check.reason)}`);
  }

  const mediaResult = await validateAndUploadMedia(formData, user.id, supabase);
  if ("error" in mediaResult) {
    redirect(`/board/${slug}/new?error=${encodeURIComponent(mediaResult.error)}`);
  }

  const { data: thread, error: insertError } = await supabase
    .from("threads")
    .insert({
      category_id: category.id,
      user_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      media: mediaResult.media,
    })
    .select("id")
    .single();

  if (insertError || !thread) {
    console.error("[createThread] insert failed:", insertError?.message);
    redirect(
      `/board/${slug}/new?error=${encodeURIComponent("スレッドの作成に失敗しました、時間をおいてお試しください")}`,
    );
  }

  revalidatePath(`/board/${slug}`);
  redirect(`/board/${slug}/${thread.id}`);
}
