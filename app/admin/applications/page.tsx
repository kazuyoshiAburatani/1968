import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateApplicationStatus } from "./actions";

export const metadata: Metadata = { title: "ベータ応募" };

type ApplicationRow = {
  id: string;
  name: string;
  email: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  prefecture: string | null;
  sns_handle: string | null;
  motivation: string | null;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "invited"
    | "registered";
  reviewer_note: string | null;
  reviewed_at: string | null;
  invited_at: string | null;
  registered_user_id: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<ApplicationRow["status"], string> = {
  pending: "未対応",
  approved: "承認済",
  rejected: "却下",
  invited: "招待済",
  registered: "登録完了",
};

const STATUS_COLOR: Record<ApplicationRow["status"], string> = {
  pending: "bg-amber-50 text-amber-900 border-amber-300",
  approved: "bg-emerald-50 text-emerald-900 border-emerald-300",
  rejected: "bg-stone-100 text-stone-700 border-stone-300",
  invited: "bg-sky-50 text-sky-900 border-sky-300",
  registered: "bg-primary/10 text-primary border-primary/30",
};

export default async function AdminApplicationsPage() {
  const admin = getSupabaseAdminClient();

  const { data } = await admin
    .from("beta_applications")
    .select(
      "id, name, email, birth_year, birth_month, birth_day, prefecture, sns_handle, motivation, status, reviewer_note, reviewed_at, invited_at, registered_user_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const apps = (data ?? []) as ApplicationRow[];

  return (
    <div>
      <h1 className="text-2xl font-bold">ベータ応募一覧</h1>
      <p className="mt-2 text-sm text-foreground/70">
        新しい順、最大 200 件。
      </p>

      {apps.length === 0 ? (
        <p className="mt-12 text-center text-foreground/70">
          まだ応募はありません。
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {apps.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-border bg-background p-5"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold">{a.name}</p>
                  <p className="text-xs text-foreground/60">
                    {a.email} ・ 1968年{a.birth_month}月{a.birth_day}日
                    {a.prefecture && ` ・ ${a.prefecture}`}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded border ${STATUS_COLOR[a.status]}`}
                >
                  {STATUS_LABEL[a.status]}
                </span>
              </div>

              {a.sns_handle && (
                <p className="mt-2 text-xs text-foreground/70">
                  SNS、{a.sns_handle}
                </p>
              )}

              {a.motivation && (
                <p className="mt-3 text-sm whitespace-pre-wrap leading-7 bg-muted/40 p-3 rounded">
                  {a.motivation}
                </p>
              )}

              <p className="mt-2 text-xs text-foreground/60">
                応募日時、{new Date(a.created_at).toLocaleString("ja-JP")}
                {a.reviewed_at && (
                  <>
                    {" ・ "}対応日時、
                    {new Date(a.reviewed_at).toLocaleString("ja-JP")}
                  </>
                )}
              </p>

              {a.status === "pending" && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  <form action={updateApplicationStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90"
                    >
                      承認
                    </button>
                  </form>
                  <form action={updateApplicationStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm hover:bg-muted"
                    >
                      却下
                    </button>
                  </form>
                </div>
              )}

              {a.status === "approved" && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  <form action={updateApplicationStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="invited" />
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm hover:bg-muted"
                    >
                      招待メール送付済にする
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
