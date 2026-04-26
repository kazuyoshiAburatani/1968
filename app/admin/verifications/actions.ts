"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  sendVerificationApproved,
  sendVerificationRejected,
} from "@/lib/email/templates";

const Schema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  rejection_reason: z.string().trim().max(200).optional(),
});

export async function reviewVerification(formData: FormData) {
  const parsed = Schema.safeParse({
    id: formData.get("id"),
    action: formData.get("action"),
    rejection_reason: formData.get("rejection_reason") ?? undefined,
  });
  if (!parsed.success) return;

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  // 対象ユーザーのメールとニックネームをメール送信用に取得
  const { data: verif } = await sb
    .from("verifications")
    .select("user_id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  let recipientEmail: string | null = null;
  let recipientNick: string | null = null;
  if (verif?.user_id) {
    const [{ data: u }, { data: p }] = await Promise.all([
      sb.from("users").select("email").eq("id", verif.user_id).maybeSingle(),
      sb
        .from("profiles")
        .select("nickname")
        .eq("user_id", verif.user_id)
        .maybeSingle(),
    ]);
    recipientEmail = (u?.email as string | null) ?? null;
    recipientNick = (p?.nickname as string | null) ?? null;
  }

  if (parsed.data.action === "approve") {
    const { error } = await sb
      .from("verifications")
      .update({
        status: "approved",
        verified_at: new Date().toISOString(),
        verified_by: admin.id,
        rejection_reason: null,
      })
      .eq("id", parsed.data.id);
    if (error) console.error("[admin/verif/approve]", error.message);

    if (recipientEmail) {
      await sendVerificationApproved({
        to: recipientEmail,
        nickname: recipientNick ?? "ご利用者",
      });
    }
  } else {
    if (!parsed.data.rejection_reason) {
      console.warn("[admin/verif/reject] rejection_reason 未入力");
      return;
    }
    const { error } = await sb
      .from("verifications")
      .update({
        status: "rejected",
        verified_at: new Date().toISOString(),
        verified_by: admin.id,
        rejection_reason: parsed.data.rejection_reason,
      })
      .eq("id", parsed.data.id);
    if (error) console.error("[admin/verif/reject]", error.message);

    if (recipientEmail) {
      await sendVerificationRejected({
        to: recipientEmail,
        nickname: recipientNick ?? "ご利用者",
        reason: parsed.data.rejection_reason,
      });
    }
  }

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/dashboard");
}
