"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["未対応", "対応中", "完了"]),
});

export async function updateReportStatus(formData: FormData) {
  const parsed = Schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "完了") {
    updates.handled_at = new Date().toISOString();
    updates.handled_by = admin.id;
  }

  const { error } = await sb
    .from("reports")
    .update(updates)
    .eq("id", parsed.data.id);
  if (error) console.error("[admin/reports/update]", error.message);

  revalidatePath("/admin/reports");
  revalidatePath("/admin/dashboard");
}
