"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { removeImage } from "@/lib/image-upload";
import { parseMedia } from "@/lib/media";
import { recordAudit } from "@/lib/audit";

// 写真だけを外す操作。
//
// 投稿ごと消さないのは、書いた人にとって「無かったこと」にされたのと同じに見えるため。
// 写真を外して文章を残せば、会話は続けられるし、必要なら本人が書き直せる。
// 誤って外したとき用に、何を外したかは audit_logs に残す（実体は戻せないので、
// 「いつ・どの投稿の写真を外したか」だけ）。

function fail(message: string): never {
  redirect(`/admin/media?error=${encodeURIComponent(message)}`);
}

const ResponseSchema = z.object({ response_id: z.string().uuid() });

export async function deleteResponsePhoto(formData: FormData) {
  const parsed = ResponseSchema.safeParse({
    response_id: formData.get("response_id"),
  });
  if (!parsed.success) fail("外す対象が分かりませんでした");

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { data: row } = await sb
    .from("topic_responses")
    .select("id, media")
    .eq("id", parsed.data.response_id)
    .maybeSingle();

  if (!row) fail("その投稿は見つかりませんでした");

  const media = parseMedia((row as { media: unknown }).media);

  const { error } = await sb
    .from("topic_responses")
    .update({ media: [] })
    .eq("id", parsed.data.response_id);
  if (error) {
    console.error("[admin/media/deleteResponsePhoto]", error.message);
    fail("写真を外せませんでした");
  }

  for (const m of media) await removeImage("post-media", m.path);

  await recordAudit({
    adminId: admin.id,
    action: "other",
    targetType: "topic_response.media",
    targetId: parsed.data.response_id,
    targetSummary: media.map((m) => m.path).join(", "),
    reason: "写真の見張りから除去",
  });

  revalidatePath("/admin/media");
  revalidatePath("/");
  redirect("/admin/media?removed=1");
}

const VoteSchema = z.object({
  poll_id: z.string().uuid(),
  voter_key: z.string().uuid(),
});

export async function deletePollPhoto(formData: FormData) {
  const parsed = VoteSchema.safeParse({
    poll_id: formData.get("poll_id"),
    voter_key: formData.get("voter_key"),
  });
  if (!parsed.success) fail("外す対象が分かりませんでした");

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { data: row } = await sb
    .from("poll_votes")
    .select("image_path")
    .eq("poll_id", parsed.data.poll_id)
    .eq("voter_key", parsed.data.voter_key)
    .maybeSingle();

  if (!row) fail("その一言は見つかりませんでした");

  const path = (row as { image_path: string | null }).image_path;

  const { error } = await sb
    .from("poll_votes")
    .update({ image_path: null })
    .eq("poll_id", parsed.data.poll_id)
    .eq("voter_key", parsed.data.voter_key);
  if (error) {
    console.error("[admin/media/deletePollPhoto]", error.message);
    fail("写真を外せませんでした");
  }

  await removeImage("post-media", path);

  await recordAudit({
    adminId: admin.id,
    action: "other",
    targetType: "poll_vote.image",
    targetId: parsed.data.poll_id,
    targetSummary: path ?? "",
    reason: "写真の見張りから除去",
  });

  revalidatePath("/admin/media");
  revalidatePath("/");
  redirect("/admin/media?removed=1");
}
