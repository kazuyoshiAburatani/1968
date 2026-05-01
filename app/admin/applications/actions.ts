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

  // 「招待済」または「承認」に変更した時、応募者へ招待メールを送信し、
  // すでに登録済みのユーザーがいれば創設メンバー扱いに back-fill する
  if (
    (parsed.data.status === "invited" || parsed.data.status === "approved") &&
    app?.email
  ) {
    if (parsed.data.status === "invited" && app.name) {
      await sendBetaInvitation({ to: app.email, name: app.name });
    }

    // 既に登録済みのユーザーを back-fill、新規登録は trigger 経由で自動付与される
    const { data: existing } = await sb
      .from("users")
      .select("id, is_founding_member")
      .ilike("email", app.email)
      .maybeSingle();

    if (existing && existing.is_founding_member !== true) {
      const tokyoYear = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
      ).getFullYear();

      await sb
        .from("users")
        .update({
          is_founding_member: true,
          founding_member_since: new Date().toISOString(),
        })
        .eq("id", existing.id);

      // 初年度の応援団称号も進呈
      await sb.from("supporters").upsert(
        {
          user_id: existing.id,
          year: tokyoYear,
          paid_at: new Date().toISOString(),
          amount_yen: 0,
          granted_by: "founding_grant",
        },
        { onConflict: "user_id,year" },
      );
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/dashboard");
}
