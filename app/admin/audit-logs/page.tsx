import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "監査ログ" };

type Row = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_summary: string | null;
  reason: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  "thread.edit": "スレッド編集",
  "thread.delete": "スレッド削除",
  "reply.edit": "返信編集",
  "reply.delete": "返信削除",
  "verification.approve": "身分証承認",
  "verification.reject": "身分証却下",
  "user.suspend": "会員停止",
  "user.activate": "会員再開",
  "user.grant_beta": "ベータ特典付与",
  "application.approve": "応募承認",
  "application.reject": "応募却下",
  "application.invite": "応募招待",
  "report.handle": "通報対応",
  other: "その他",
};

const ACTION_COLOR: Record<string, string> = {
  "thread.delete": "bg-rose-50 text-rose-900 border-rose-300",
  "reply.delete": "bg-rose-50 text-rose-900 border-rose-300",
  "thread.edit": "bg-amber-50 text-amber-900 border-amber-300",
  "reply.edit": "bg-amber-50 text-amber-900 border-amber-300",
  "verification.approve": "bg-emerald-50 text-emerald-900 border-emerald-300",
  "verification.reject": "bg-stone-100 text-stone-700 border-stone-300",
  "user.suspend": "bg-rose-50 text-rose-900 border-rose-300",
  "application.invite": "bg-sky-50 text-sky-900 border-sky-300",
};

export default async function AuditLogsPage() {
  const sb = getSupabaseAdminClient();

  const { data } = await sb
    .from("audit_logs")
    .select(
      "id, admin_id, action, target_type, target_id, target_summary, reason, before_data, after_data, ip_address, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  // 管理者名前を補助情報として取得
  const adminIds = [...new Set(rows.map((r) => r.admin_id).filter(Boolean) as string[])];
  const adminMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: admins } = await sb
      .from("admins")
      .select("id, email")
      .in("id", adminIds);
    for (const a of admins ?? []) {
      adminMap.set(a.id as string, a.email as string);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">監査ログ</h1>
      <p className="mt-2 text-sm text-foreground/70">
        運営による操作履歴。新しい順、最大 200 件。
      </p>

      {rows.length === 0 ? (
        <p className="mt-12 text-center text-foreground/70">
          まだ操作履歴はありません。
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded border ${ACTION_COLOR[r.action] ?? "bg-muted text-foreground/70 border-border"}`}
                  >
                    {ACTION_LABEL[r.action] ?? r.action}
                  </span>
                  <span className="text-xs text-foreground/60">
                    {r.target_type}
                    {r.target_id && ` ・ ${r.target_id.slice(0, 8)}…`}
                  </span>
                </div>
                <span className="text-xs text-foreground/60">
                  {new Date(r.created_at).toLocaleString("ja-JP")}
                </span>
              </div>

              {r.target_summary && (
                <p className="mt-2 text-sm text-foreground/85 line-clamp-2">
                  {r.target_summary}
                </p>
              )}

              {r.reason && (
                <p className="mt-2 text-sm bg-muted/40 p-2 rounded">
                  <span className="text-xs text-foreground/60">理由、</span>
                  {r.reason}
                </p>
              )}

              <p className="mt-2 text-xs text-foreground/60">
                操作者、{r.admin_id ? (adminMap.get(r.admin_id) ?? r.admin_id.slice(0, 8)) : "（不明）"}
                {r.ip_address && ` ・ IP ${r.ip_address}`}
              </p>

              {(r.before_data || r.after_data) && (
                <details className="mt-2">
                  <summary className="text-xs text-foreground/60 cursor-pointer">
                    変更前後の差分を表示
                  </summary>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs font-mono">
                    {r.before_data && (
                      <div className="bg-rose-50 border border-rose-200 rounded p-2 overflow-auto max-h-48">
                        <p className="text-rose-900 font-bold mb-1">変更前</p>
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(r.before_data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {r.after_data && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded p-2 overflow-auto max-h-48">
                        <p className="text-emerald-900 font-bold mb-1">
                          変更後
                        </p>
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(r.after_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
