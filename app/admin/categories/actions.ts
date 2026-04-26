"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit";
import { CategoryUpsertSchema } from "@/lib/validation/category";

function fail(message: string, redirectTo: string): never {
  redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
}

function bumpCategoryCache() {
  // unstable_cache の tag「categories」を無効化、Next.js 16 では cacheLife プロファイル必須
  revalidateTag("categories", "minutes");
  revalidatePath("/board");
  revalidatePath("/timeline");
  revalidatePath("/admin/categories");
}

// =======================================
// 新規カテゴリ作成
// =======================================
export async function createCategory(formData: FormData) {
  const parsed = CategoryUpsertSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    display_order: formData.get("display_order"),
    tier: formData.get("tier"),
    access_level_view: formData.get("access_level_view"),
    access_level_post: formData.get("access_level_post"),
    posting_limit_per_day: formData.get("posting_limit_per_day"),
    requires_tenure_months: formData.get("requires_tenure_months") ?? 0,
  });
  if (!parsed.success) {
    fail(
      parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      "/admin/categories/new",
    );
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  // slug 重複チェック
  const { data: dup } = await sb
    .from("categories")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (dup) {
    fail(`slug「${parsed.data.slug}」は既に使われています`, "/admin/categories/new");
  }

  const { data: created, error } = await sb
    .from("categories")
    .insert(parsed.data)
    .select("id, slug, name")
    .single();
  if (error || !created) {
    console.error("[admin/categories/create]", error?.message);
    fail("カテゴリ作成に失敗しました", "/admin/categories/new");
  }

  await recordAudit({
    adminId: admin.id,
    action: "other",
    targetType: "category",
    targetId: String(created.id),
    targetSummary: `${created.name}（${created.slug}）を新規作成`,
    after: parsed.data as unknown as Record<string, unknown>,
  });

  bumpCategoryCache();
  redirect("/admin/categories?saved=1");
}

// =======================================
// カテゴリ更新
// =======================================
const UpdateSchema = CategoryUpsertSchema.extend({
  id: z.coerce.number().int().min(1),
});

export async function updateCategory(formData: FormData) {
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    display_order: formData.get("display_order"),
    tier: formData.get("tier"),
    access_level_view: formData.get("access_level_view"),
    access_level_post: formData.get("access_level_post"),
    posting_limit_per_day: formData.get("posting_limit_per_day"),
    requires_tenure_months: formData.get("requires_tenure_months") ?? 0,
  });
  if (!parsed.success) {
    const id = formData.get("id");
    fail(
      parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      `/admin/categories/${id}/edit`,
    );
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { id, ...rest } = parsed.data;

  // slug 重複チェック、自分以外
  const { data: dup } = await sb
    .from("categories")
    .select("id")
    .eq("slug", rest.slug)
    .neq("id", id)
    .maybeSingle();
  if (dup) {
    fail(`slug「${rest.slug}」は他のカテゴリで使われています`, `/admin/categories/${id}/edit`);
  }

  const { data: before } = await sb
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("categories").update(rest).eq("id", id);
  if (error) {
    console.error("[admin/categories/update]", error.message);
    fail("カテゴリ更新に失敗しました", `/admin/categories/${id}/edit`);
  }

  await recordAudit({
    adminId: admin.id,
    action: "other",
    targetType: "category",
    targetId: String(id),
    targetSummary: `${rest.name}（${rest.slug}）を更新`,
    before: before as Record<string, unknown> | null,
    after: rest as unknown as Record<string, unknown>,
  });

  bumpCategoryCache();
  redirect("/admin/categories?saved=1");
}

// =======================================
// カテゴリ削除
// 通常はスレッド 0 件のみ削除可能、cascade=on でスレッドも一括削除する強制モードあり
// =======================================
const DeleteSchema = z.object({
  id: z.coerce.number().int().min(1),
  cascade: z.literal("on").optional(),
});

export async function deleteCategory(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: formData.get("id"),
    cascade: formData.get("cascade") ?? undefined,
  });
  if (!parsed.success) return;

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { count: threadCount } = await sb
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("category_id", parsed.data.id);

  if ((threadCount ?? 0) > 0 && parsed.data.cascade !== "on") {
    fail(
      `このカテゴリにはスレッドが ${threadCount} 件残っています。スレッドごと削除する場合は「中の投稿もまとめて削除する」にチェックしてください。`,
      "/admin/categories",
    );
  }

  const { data: before } = await sb
    .from("categories")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  // cascade=on の場合、まず該当カテゴリのスレッド本体と添付メディアを取得して削除
  if (parsed.data.cascade === "on" && (threadCount ?? 0) > 0) {
    const { data: threadsToDelete } = await sb
      .from("threads")
      .select("id, media")
      .eq("category_id", parsed.data.id);
    const mediaPaths: string[] = [];
    for (const t of threadsToDelete ?? []) {
      const items = (t.media as Array<{ path?: string }> | null) ?? [];
      for (const m of items) {
        if (m.path) mediaPaths.push(m.path);
      }
    }
    // スレッド削除（CASCADE で replies / likes / reports も連鎖）
    const { error: delErr } = await sb
      .from("threads")
      .delete()
      .eq("category_id", parsed.data.id);
    if (delErr) {
      console.error("[admin/categories/delete] thread delete failed:", delErr.message);
      fail("関連スレッドの削除に失敗しました", "/admin/categories");
    }
    if (mediaPaths.length > 0) {
      await sb.storage.from("post-media").remove(mediaPaths);
    }
  }

  const { error } = await sb
    .from("categories")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[admin/categories/delete]", error.message);
    fail("削除に失敗しました", "/admin/categories");
  }

  await recordAudit({
    adminId: admin.id,
    action: "other",
    targetType: "category",
    targetId: String(parsed.data.id),
    targetSummary:
      ((before as { name?: string } | null)?.name ?? "") +
      ` を削除（cascade=${parsed.data.cascade === "on" ? "yes" : "no"}, スレッド ${threadCount ?? 0} 件）`,
    before: before as Record<string, unknown> | null,
  });

  bumpCategoryCache();
  redirect("/admin/categories?saved=1");
}
