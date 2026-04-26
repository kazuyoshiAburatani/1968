import "server-only";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "thread.edit"
  | "thread.delete"
  | "reply.edit"
  | "reply.delete"
  | "verification.approve"
  | "verification.reject"
  | "user.suspend"
  | "user.activate"
  | "user.grant_beta"
  | "application.approve"
  | "application.reject"
  | "application.invite"
  | "report.handle"
  | "other";

type LogParams = {
  adminId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  targetSummary?: string;
  reason?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

// 運営の重要操作を audit_logs に記録する。失敗してもアプリは続行する設計。
export async function recordAudit(params: LogParams): Promise<void> {
  try {
    const sb = getSupabaseAdminClient();
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      null;

    await sb.from("audit_logs").insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      target_summary: params.targetSummary ?? null,
      reason: params.reason ?? null,
      before_data: params.before ?? null,
      after_data: params.after ?? null,
      ip_address: ip,
    });
  } catch (e) {
    console.error("[audit] failed to record:", e);
  }
}
