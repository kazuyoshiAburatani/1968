"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RecommendationUpsertSchema } from "@/lib/validation/recommendation";

function fail(message: string): never {
  redirect(`/admin/recommendations?error=${encodeURIComponent(message)}`);
}

function parseFromForm(formData: FormData) {
  return RecommendationUpsertSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "other",
    image_url: formData.get("image_url") ?? "",
    affiliate_url: formData.get("affiliate_url"),
    affiliate_provider: formData.get("affiliate_provider") ?? "",
    price_yen: formData.get("price_yen") ?? "",
    display_order: formData.get("display_order") ?? 100,
    is_active: formData.get("is_active") ?? undefined,
  });
}

export async function createRecommendation(formData: FormData) {
  const parsed = parseFromForm(formData);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }
  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("recommendations")
    .insert({ ...parsed.data, created_by: admin.id });
  if (error) {
    console.error("[admin/recommendations/create]", error.message);
    fail("作成に失敗しました");
  }
  revalidatePath("/admin/recommendations");
  revalidatePath("/picks");
  revalidatePath("/");
  redirect("/admin/recommendations?saved=created");
}

const UpdateSchema = RecommendationUpsertSchema.extend({
  id: z.string().uuid(),
});

export async function updateRecommendation(formData: FormData) {
  const merged = RecommendationUpsertSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "other",
    image_url: formData.get("image_url") ?? "",
    affiliate_url: formData.get("affiliate_url"),
    affiliate_provider: formData.get("affiliate_provider") ?? "",
    price_yen: formData.get("price_yen") ?? "",
    display_order: formData.get("display_order") ?? 100,
    is_active: formData.get("is_active") ?? undefined,
  });
  const idParse = z
    .object({ id: z.string().uuid() })
    .safeParse({ id: formData.get("id") });
  if (!merged.success || !idParse.success) {
    fail(
      merged.success
        ? "id が不正です"
        : merged.error.issues[0]?.message ?? "入力内容を確認してください",
    );
  }
  await requireAdmin();
  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("recommendations")
    .update(merged.data)
    .eq("id", idParse.data.id);
  if (error) fail("更新に失敗しました");
  revalidatePath("/admin/recommendations");
  revalidatePath("/picks");
  revalidatePath("/");
  redirect("/admin/recommendations?saved=updated");
}

export async function deleteRecommendation(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await requireAdmin();
  const sb = getSupabaseAdminClient();
  await sb.from("recommendations").delete().eq("id", id);
  revalidatePath("/admin/recommendations");
  revalidatePath("/picks");
  revalidatePath("/");
}
