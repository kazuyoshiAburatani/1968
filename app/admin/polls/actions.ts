"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PollUpsertSchema } from "@/lib/validation/topic";

function fail(message: string): never {
  redirect(`/admin/polls?error=${encodeURIComponent(message)}`);
}

function readForm(formData: FormData) {
  return {
    question: formData.get("question"),
    option_a: formData.get("option_a"),
    option_b: formData.get("option_b"),
    blurb: formData.get("blurb") ?? "",
    era: formData.get("era") ?? "",
    gender_lean: formData.get("gender_lean") ?? "both",
    published_at: formData.get("published_at"),
    expires_at: formData.get("expires_at") ?? "",
    is_active: formData.get("is_active") ?? undefined,
  };
}

export async function createPoll(formData: FormData) {
  const parsed = PollUpsertSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { error } = await sb
    .from("polls")
    .insert({ ...parsed.data, created_by: admin.id });
  if (error) {
    console.error("[admin/polls/create]", error.message);
    fail("二択の作成に失敗しました");
  }

  revalidatePath("/admin/polls");
  revalidatePath("/");
  redirect("/admin/polls?saved=created");
}

const UpdateSchema = PollUpsertSchema.extend({ id: z.string().uuid() });

export async function updatePoll(formData: FormData) {
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    ...readForm(formData),
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  await requireAdmin();
  const sb = getSupabaseAdminClient();
  const { id, ...rest } = parsed.data;
  const { error } = await sb.from("polls").update(rest).eq("id", id);
  if (error) {
    console.error("[admin/polls/update]", error.message);
    fail("二択の更新に失敗しました");
  }

  revalidatePath("/admin/polls");
  revalidatePath("/");
  redirect("/admin/polls?saved=updated");
}

const DeleteSchema = z.object({ id: z.string().uuid() });

export async function deletePoll(formData: FormData) {
  const parsed = DeleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  await requireAdmin();
  const sb = getSupabaseAdminClient();
  await sb.from("polls").delete().eq("id", parsed.data.id);
  revalidatePath("/admin/polls");
  revalidatePath("/");
}
