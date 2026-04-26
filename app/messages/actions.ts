"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { MessageSendSchema } from "@/lib/validation/message";

function fail(peerId: string, message: string): never {
  redirect(`/messages/${peerId}?error=${encodeURIComponent(message)}`);
}

export async function sendMessage(formData: FormData) {
  const parsed = MessageSendSchema.safeParse({
    receiver_id: formData.get("receiver_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const peer = (formData.get("receiver_id") as string | null) ?? "";
    fail(peer, parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { supabase, user } = await requireSession();

  if (parsed.data.receiver_id === user.id) {
    fail(parsed.data.receiver_id, "自分自身へのメッセージは送れません");
  }

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: parsed.data.receiver_id,
    body: parsed.data.body,
  });

  if (error) {
    console.error("[messages/send] insert failed:", error.message);
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
