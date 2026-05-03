"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { ProfileUpdateSchema } from "@/lib/validation/profile";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  AVATAR_MAX_SIZE,
  avatarExtensionFromMime,
} from "@/lib/avatar";

export async function updateProfile(formData: FormData) {
  const parsed = ProfileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(`/mypage/profile?error=${encodeURIComponent(first.message)}`);
  }

  const { supabase, user } = await requireSession();

  // home_banner_color カラムが未適用の環境でも動くよう、まず全フィールドで UPDATE を試み、
  // 失敗したら home_banner_color を除いて再実行する。
  // home_banner_color は別個に try/catch で書く、こちらが失敗しても他のフィールドは保存される。
  const { home_banner_color, ...coreFields } = parsed.data;

  const { error: coreError } = await supabase
    .from("profiles")
    .update(coreFields)
    .eq("user_id", user.id);

  if (coreError) {
    console.error("[profile-edit] core update failed:", coreError.message);
    redirect(
      `/mypage/profile?error=${encodeURIComponent("更新に失敗しました、時間をおいてお試しください")}`,
    );
  }

  // バナー色は別 UPDATE、カラム未適用なら無視
  try {
    await supabase
      .from("profiles")
      .update({ home_banner_color })
      .eq("user_id", user.id);
  } catch (e) {
    console.warn(
      "[profile-edit] home_banner_color update skipped:",
      e instanceof Error ? e.message : e,
    );
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  redirect("/mypage?saved=1");
}

function failAvatar(message: string): never {
  redirect(`/mypage/profile?error=${encodeURIComponent(message)}`);
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) {
    failAvatar("画像ファイルを選択してください");
  }
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    failAvatar("JPEG / PNG / WebP の画像をお選びください");
  }
  if (file.size > AVATAR_MAX_SIZE) {
    failAvatar("ファイルサイズが大きすぎます、5 MB 以内でお願いします");
  }

  const { supabase, user } = await requireSession();

  // 既存のアバター画像を取得して、後で削除する
  const { data: prof } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const oldPath = (prof?.avatar_url as string | null | undefined) ?? null;

  // 新しいパスを発行、{user_id}/{uuid}.{ext}
  const ext = avatarExtensionFromMime(file.type);
  const newPath = `${user.id}/${randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("profile-avatars")
    .upload(newPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    console.error("[avatar/upload] upload failed:", upErr.message);
    failAvatar("アップロードに失敗しました、時間をおいてお試しください");
  }

  // profiles.avatar_url にパスを保存
  const { error: updErr } = await supabase
    .from("profiles")
    .update({ avatar_url: newPath })
    .eq("user_id", user.id);
  if (updErr) {
    console.error("[avatar/upload] profile update failed:", updErr.message);
    // アップロード済みファイルを巻き戻し
    await supabase.storage.from("profile-avatars").remove([newPath]);
    failAvatar("プロフィール更新に失敗しました");
  }

  // 古い画像を削除（失敗しても致命的でない）
  if (oldPath && oldPath !== newPath && !oldPath.startsWith("http")) {
    await supabase.storage.from("profile-avatars").remove([oldPath]);
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  redirect("/mypage/profile?saved=avatar");
}

export async function removeAvatar() {
  const { supabase, user } = await requireSession();

  const { data: prof } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const oldPath = (prof?.avatar_url as string | null | undefined) ?? null;

  await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("user_id", user.id);

  if (oldPath && !oldPath.startsWith("http")) {
    await supabase.storage.from("profile-avatars").remove([oldPath]);
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  redirect("/mypage/profile?saved=avatar-removed");
}
