"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit";

// 運営による投稿モデレーション、編集と削除。
// service_role で RLS をバイパス、すべて audit_logs に記録、
// 編集時は threads/replies.admin_edited_at をマーク。

const EditThreadSchema = z.object({
  thread_id: z.string().uuid(),
  slug: z.string(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(120, "タイトルは120文字以内で入力してください"),
  body: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内で入力してください"),
  reason: z.string().trim().max(300).optional(),
});

const EditReplySchema = z.object({
  reply_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  slug: z.string(),
  body: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(3000, "返信は3000文字以内で入力してください"),
  reason: z.string().trim().max(300).optional(),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  thread_id: z.string().uuid().optional(),
  reason: z
    .string()
    .trim()
    .min(1, "削除理由を入力してください、監査ログに残ります")
    .max(300, "削除理由は300文字以内で入力してください"),
});

function fail(slug: string, threadId: string, message: string): never {
  redirect(
    `/board/${slug}/${threadId}?error=${encodeURIComponent(message)}`,
  );
}

export async function adminEditThread(formData: FormData) {
  const parsed = EditThreadSchema.safeParse({
    thread_id: formData.get("thread_id"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    const slug = String(formData.get("slug") ?? "");
    const tid = String(formData.get("thread_id") ?? "");
    fail(slug, tid, parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  // 編集前のデータを取得（監査ログに残す）
  const { data: before } = await sb
    .from("threads")
    .select("title, body")
    .eq("id", parsed.data.thread_id)
    .maybeSingle();

  const { error } = await sb
    .from("threads")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      updated_at: new Date().toISOString(),
      admin_edited_at: new Date().toISOString(),
      admin_edited_by: admin.id,
    })
    .eq("id", parsed.data.thread_id);

  if (error) {
    console.error("[admin/thread/edit]", error.message);
    fail(parsed.data.slug, parsed.data.thread_id, "編集に失敗しました");
  }

  await recordAudit({
    adminId: admin.id,
    action: "thread.edit",
    targetType: "thread",
    targetId: parsed.data.thread_id,
    targetSummary: parsed.data.title.slice(0, 80),
    reason: parsed.data.reason,
    before: before as Record<string, unknown> | null,
    after: { title: parsed.data.title, body: parsed.data.body },
  });

  revalidatePath(`/board/${parsed.data.slug}/${parsed.data.thread_id}`);
  revalidatePath(`/board/${parsed.data.slug}`);
  redirect(
    `/board/${parsed.data.slug}/${parsed.data.thread_id}?moderated=edit`,
  );
}

export async function adminDeleteThread(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const slug = String(formData.get("slug") ?? "");
    const tid = String(formData.get("id") ?? "");
    fail(slug, tid, parsed.error.issues[0]?.message ?? "削除理由を入力してください");
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  // 削除前のデータを記録
  const { data: before } = await sb
    .from("threads")
    .select("title, body, user_id, category_id, created_at")
    .eq("id", parsed.data.id)
    .maybeSingle();

  await recordAudit({
    adminId: admin.id,
    action: "thread.delete",
    targetType: "thread",
    targetId: parsed.data.id,
    targetSummary:
      (before as { title?: string } | null)?.title?.slice(0, 80) ?? undefined,
    reason: parsed.data.reason,
    before: before as Record<string, unknown> | null,
  });

  // 関連する replies / likes / reports / media は ON DELETE CASCADE で連鎖
  const { error } = await sb
    .from("threads")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    console.error("[admin/thread/delete]", error.message);
  }

  revalidatePath(`/board/${parsed.data.slug}`);
  redirect(`/board/${parsed.data.slug}?moderated=deleted`);
}

export async function adminEditReply(formData: FormData) {
  const parsed = EditReplySchema.safeParse({
    reply_id: formData.get("reply_id"),
    thread_id: formData.get("thread_id"),
    slug: formData.get("slug"),
    body: formData.get("body"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    const slug = String(formData.get("slug") ?? "");
    const tid = String(formData.get("thread_id") ?? "");
    fail(slug, tid, parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { data: before } = await sb
    .from("replies")
    .select("body")
    .eq("id", parsed.data.reply_id)
    .maybeSingle();

  const { error } = await sb
    .from("replies")
    .update({
      body: parsed.data.body,
      updated_at: new Date().toISOString(),
      admin_edited_at: new Date().toISOString(),
      admin_edited_by: admin.id,
    })
    .eq("id", parsed.data.reply_id);

  if (error) {
    console.error("[admin/reply/edit]", error.message);
    fail(parsed.data.slug, parsed.data.thread_id, "返信編集に失敗しました");
  }

  await recordAudit({
    adminId: admin.id,
    action: "reply.edit",
    targetType: "reply",
    targetId: parsed.data.reply_id,
    targetSummary: parsed.data.body.slice(0, 80),
    reason: parsed.data.reason,
    before: before as Record<string, unknown> | null,
    after: { body: parsed.data.body },
  });

  revalidatePath(`/board/${parsed.data.slug}/${parsed.data.thread_id}`);
  redirect(
    `/board/${parsed.data.slug}/${parsed.data.thread_id}?moderated=edit#reply-${parsed.data.reply_id}`,
  );
}

export async function adminDeleteReply(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    thread_id: formData.get("thread_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const slug = String(formData.get("slug") ?? "");
    const tid = String(formData.get("thread_id") ?? "");
    fail(slug, tid, parsed.error.issues[0]?.message ?? "削除理由を入力してください");
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { data: before } = await sb
    .from("replies")
    .select("body, user_id, thread_id, created_at")
    .eq("id", parsed.data.id)
    .maybeSingle();

  await recordAudit({
    adminId: admin.id,
    action: "reply.delete",
    targetType: "reply",
    targetId: parsed.data.id,
    targetSummary:
      ((before as { body?: string } | null)?.body ?? "").slice(0, 80),
    reason: parsed.data.reason,
    before: before as Record<string, unknown> | null,
  });

  const { error } = await sb.from("replies").delete().eq("id", parsed.data.id);
  if (error) {
    console.error("[admin/reply/delete]", error.message);
  }

  if (parsed.data.thread_id) {
    revalidatePath(
      `/board/${parsed.data.slug}/${parsed.data.thread_id}`,
    );
  }
  redirect(
    parsed.data.thread_id
      ? `/board/${parsed.data.slug}/${parsed.data.thread_id}?moderated=deleted`
      : `/board/${parsed.data.slug}?moderated=deleted`,
  );
}
