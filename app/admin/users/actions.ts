"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const StatusSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(["active", "suspended", "withdrawn"]),
});

export async function updateUserStatus(formData: FormData) {
  const parsed = StatusSchema.safeParse({
    user_id: formData.get("user_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { error } = await sb
    .from("users")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.user_id);
  if (error) console.error("[admin/users/status]", error.message);

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
}

const BetaSchema = z.object({
  user_id: z.string().uuid(),
});

export async function grantBetaTester(formData: FormData) {
  const parsed = BetaSchema.safeParse({ user_id: formData.get("user_id") });
  if (!parsed.success) return;

  await requireAdmin();
  const sb = getSupabaseAdminClient();

  // 1 年間のベータ特典を付与、トリガでランクが regular に上がる
  const expiresAt = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await sb
    .from("users")
    .update({
      is_beta_tester: true,
      beta_grant_expires_at: expiresAt,
    })
    .eq("id", parsed.data.user_id);
  if (error) console.error("[admin/users/grant-beta]", error.message);

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
}
