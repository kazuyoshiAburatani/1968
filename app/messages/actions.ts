"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import {
  IMAGE_MIMES,
  MAX_IMAGE_SIZE,
  getExtensionFromMime,
  type MediaItem,
} from "@/lib/media";

// DM では画像のみ許可、最大 4 枚、テキストは任意（画像があれば本文 0 文字でも OK）
const MAX_IMAGES_PER_DM = 4;

const SendBodySchema = z.object({
  receiver_id: z.string().uuid({ message: "送信先が不正です" }),
  body: z.string().trim().max(2000, "メッセージは2000文字以内で入力してください"),
});

function fail(peerId: string, message: string): never {
  redirect(`/messages/${peerId}?error=${encodeURIComponent(message)}`);
}

export async function sendMessage(formData: FormData) {
  const parsed = SendBodySchema.safeParse({
    receiver_id: formData.get("receiver_id"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    const peer = (formData.get("receiver_id") as string | null) ?? "";
    fail(peer, parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { supabase, user } = await requireSession();

  if (parsed.data.receiver_id === user.id) {
    fail(parsed.data.receiver_id, "自分自身へのメッセージは送れません");
  }

  // 画像をアップロード
  const imageFiles = formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (imageFiles.length > MAX_IMAGES_PER_DM) {
    fail(
      parsed.data.receiver_id,
      `画像は最大 ${MAX_IMAGES_PER_DM} 枚までです`,
    );
  }
  for (const f of imageFiles) {
    if (!IMAGE_MIMES.includes(f.type)) {
      fail(
        parsed.data.receiver_id,
        "対応していない画像形式です（JPEG/PNG/WebP/GIF）",
      );
    }
    if (f.size > MAX_IMAGE_SIZE) {
      fail(
        parsed.data.receiver_id,
        "画像サイズが大きすぎます（5 MB 以下）",
      );
    }
  }

  // 本文も画像も無いと送信不可
  if (parsed.data.body.length === 0 && imageFiles.length === 0) {
    fail(parsed.data.receiver_id, "メッセージを入力するか画像を添付してください");
  }

  // post-media バケットに保存（既存の RLS で本人フォルダのみ書き込み可）
  const uploaded: MediaItem[] = [];
  for (const file of imageFiles) {
    const path = `${user.id}/${crypto.randomUUID()}.${getExtensionFromMime(file.type)}`;
    const { error } = await supabase.storage
      .from("post-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[messages/send] upload failed:", error.message);
      // 既にアップロードしたものをロールバック
      if (uploaded.length > 0) {
        await supabase.storage
          .from("post-media")
          .remove(uploaded.map((m) => m.path));
      }
      fail(parsed.data.receiver_id, "画像のアップロードに失敗しました");
    }
    uploaded.push({
      path,
      type: "image",
      mime: file.type,
      size: file.size,
    });
  }

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: parsed.data.receiver_id,
    body: parsed.data.body,
    media: uploaded,
  });

  if (error) {
    console.error("[messages/send] insert failed:", error.message);
    // 巻き戻し
    if (uploaded.length > 0) {
      await supabase.storage
        .from("post-media")
        .remove(uploaded.map((m) => m.path));
    }
    fail(
      parsed.data.receiver_id,
      "送信に失敗しました。お相手が正会員でないか、システムエラーの可能性があります",
    );
  }

  revalidatePath(`/messages/${parsed.data.receiver_id}`);
  revalidatePath("/messages");
  redirect(`/messages/${parsed.data.receiver_id}`);
}

export async function markConversationRead(peerId: string) {
  const { supabase, user } = await requireSession();

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", peerId)
    .eq("receiver_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[messages/read] update failed:", error.message);
  }

  revalidatePath(`/messages/${peerId}`);
  revalidatePath("/messages");
}
