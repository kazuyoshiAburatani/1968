"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendBetaInvitation } from "@/lib/email/templates";

const Schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "invited", "registered"]),
});

export async function updateApplicationStatus(formData: FormData) {
  const parsed = Schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  // 申請の現在情報を取得、メール送信に必要
  const { data: app } = await sb
    .from("beta_applications")
    .select("name, email, status")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: admin.id,
  };
  if (parsed.data.status === "invited") {
    updates.invited_at = new Date().toISOString();
  }

  const { error } = await sb
    .from("beta_applications")
    .update(updates)
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[admin/applications] update failed:", error.message);
  }

  // 「招待済」に変更した時、応募者へ招待メールを送信
  if (parsed.data.status === "invited" && app?.email && app?.name) {
    await sendBetaInvitation({ to: app.email, name: app.name });
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/dashboard");
}
