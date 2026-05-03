"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { TopicUpsertSchema } from "@/lib/validation/topic";

function fail(message: string): never {
  redirect(`/admin/topics?error=${encodeURIComponent(message)}`);
}

export async function createTopic(formData: FormData) {
  const parsed = TopicUpsertSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    audience: formData.get("audience") ?? "all",
    related_category_id: formData.get("related_category_id") ?? null,
    published_at: formData.get("published_at"),
    expires_at: formData.get("expires_at") ?? "",
    is_active: formData.get("is_active") ?? undefined,
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { error } = await sb.from("topics").insert({
    ...parsed.data,
    created_by: admin.id,
  });
  if (error) {
    console.error("[admin/topics/create]", error.message);
    fail("お題の作成に失敗しました");
  }

  revalidatePath("/admin/topics");
  revalidatePath("/");
  redirect("/admin/topics?saved=created");
}

const UpdateSchema = TopicUpsertSchema.extend({
  id: z.string().uuid(),
});

export async function updateTopic(formData: FormData) {
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    audience: formData.get("audience") ?? "all",
    related_category_id: formData.get("related_category_id") ?? null,
    published_at: formData.get("published_at"),
    expires_at: formData.get("expires_at") ?? "",
    is_active: formData.get("is_active") ?? undefined,
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  await requireAdmin();
  const sb = getSupabaseAdminClient();
  const { id, ...rest } = parsed.data;
  const { error } = await sb.from("topics").update(rest).eq("id", id);
  if (error) {
    console.error("[admin/topics/update]", error.message);
    fail("お題の更新に失敗しました");
  }

  revalidatePath("/admin/topics");
  revalidatePath("/");
  redirect("/admin/topics?saved=updated");
}

const DeleteSchema = z.object({ id: z.string().uuid() });

export async function deleteTopic(formData: FormData) {
  const parsed = DeleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  await requireAdmin();
  const sb = getSupabaseAdminClient();
  await sb.from("topics").delete().eq("id", parsed.data.id);
  revalidatePath("/admin/topics");
  revalidatePath("/");
}
