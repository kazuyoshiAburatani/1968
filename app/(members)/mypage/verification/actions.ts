"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import {
  ALLOWED_VERIFICATION_MIME_TYPES,
  MAX_VERIFICATION_FILE_SIZE,
  VerificationSubmitSchema,
} from "@/lib/validation/verification";

const BUCKET = "verification-documents";

function fail(message: string): never {
  redirect(`/mypage/verification?error=${encodeURIComponent(message)}`);
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export async function submitVerification(formData: FormData) {
  const parsed = VerificationSubmitSchema.safeParse({
    document_type: formData.get("document_type"),
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const file = formData.get("document") as File | null;
  if (!file || file.size === 0) {
    fail("本人確認書類の画像を選択してください");
  }
  if (!ALLOWED_VERIFICATION_MIME_TYPES.includes(file.type)) {
    fail("画像（JPEG/PNG/WebP）または PDF を選択してください");
  }
  if (file.size > MAX_VERIFICATION_FILE_SIZE) {
    fail("ファイルサイズが大きすぎます（最大 10 MB）");
  }

  const { supabase, user } = await requireSession();

  // 既に pending がある場合は新規申請を弾く（DB の RLS でも弾かれるが、UX のため事前に確認）
  const { data: existingPending } = await supabase
    .from("verifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existingPending) {
    fail("審査中の申請があります。結果が出てから再度提出してください");
  }

  const ext = extensionFromMime(file.type);
  const path = `${user.id}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    console.error("[verification/submit] upload failed:", uploadError.message);
    fail("画像のアップロードに失敗しました、時間をおいてお試しください");
  }

  const { error: insertError } = await supabase.from("verifications").insert({
    user_id: user.id,
    document_type: parsed.data.document_type,
    status: "pending",
    image_storage_path: path,
  });
  if (insertError) {
    console.error("[verification/submit] insert failed:", insertError.message);
    // 失敗時はアップロード済みファイルをロールバック
    await supabase.storage.from(BUCKET).remove([path]);
    fail("申請の登録に失敗しました、時間をおいてお試しください");
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/verification");
  redirect("/mypage/verification?submitted=1");
}
