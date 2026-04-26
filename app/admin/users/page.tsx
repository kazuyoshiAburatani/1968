import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateUserStatus, grantBetaTester } from "./actions";

export const metadata: Metadata = { title: "会員管理" };

type UserRow = {
  id: string;
  email: string;
  status: "active" | "suspended" | "withdrawn";
  membership_rank: "member" | "regular";
  verified: boolean;
  is_beta_tester: boolean;
  beta_grant_expires_at: string | null;
  is_ai_persona: boolean;
  stripe_customer_id: string | null;
  created_at: string;
};

type Props = {
  searchParams: Promise<{ q?: string; rank?: "member" | "regular" | "all" }>;
};

const RANK_BADGE: Record<UserRow["membership_rank"], string> = {
  member: "bg-muted text-foreground/70 border-border",
  regular: "bg-primary/10 text-primary border-primary/30",
};
const STATUS_BADGE: Record<UserRow["status"], string> = {
  active: "bg-emerald-50 text-emerald-900 border-emerald-300",
  suspended: "bg-red-50 text-red-900 border-red-300",
  withdrawn: "bg-stone-100 text-stone-700 border-stone-300",
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q = "", rank = "all" } = await searchParams;
  const admin = getSupabaseAdminClient();

  let query = admin
    .from("users")
    .select(
      "id, email, status, membership_rank, verified, is_beta_tester, beta_grant_expires_at, is_ai_persona, stripe_customer_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) {
    query = query.ilike("email", `%${q}%`);
  }
  if (rank !== "all") {
    query = query.eq("membership_rank", rank);
  }

  const { data } = await query;
  const users = (data ?? []) as UserRow[];

  const userIds = users.map((u) => u.id);
  const profiles =
    userIds.length > 0
      ? (
          await admin
            .from("profiles")
            .select("user_id, nickname, prefecture")
            .in("user_id", userIds)
        ).data ?? []
      : [];
  const profMap = new Map(
    profiles.map(
      (p: {
        user_id: string;
        nickname: string;
        prefecture: string | null;
      }) => [p.user_id, p],
    ),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">会員管理</h1>

      <form className="mt-4 flex gap-2 flex-wrap items-center" action="/admin/users">
        <input
          type="text"
          name="q"
          placeholder="メール検索"
          defaultValue={q}
          className="min-h-[var(--spacing-tap)] px-3 rounded border border-border text-sm"
        />
        <select
          name="rank"
          defaultValue={rank}
          className="min-h-[var(--spacing-tap)] px-3 rounded border border-border text-sm"
        >
          <option value="all">すべて</option>
          <option value="member">無料会員</option>
          <option value="regular">正会員</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium"
        >
          検索
        </button>
      </form>

      <p className="mt-3 text-xs text-foreground/60">
        {users.length} 件表示（最大 200）
      </p>

      <ul className="mt-4 space-y-3">
        {users.map((u) => {
          const profile = profMap.get(u.id) as
            | { nickname: string; prefecture: string | null }
            | undefined;
          const betaExpired =
            u.is_beta_tester &&
            u.beta_grant_expires_at &&
            new Date(u.beta_grant_expires_at) < new Date();
          return (
            <li
              key={u.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold truncate">
                    {profile?.nickname ?? "（プロフィール未作成）"}
                    {u.is_ai_persona && (
                      <span className="ml-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-px rounded">
                        運営AI
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    {u.email}
                    {profile?.prefecture && ` ・ ${profile.prefecture}`}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-px rounded border ${RANK_BADGE[u.membership_rank]}`}
                  >
                    {u.membership_rank === "regular" ? "正会員" : "無料"}
                  </span>
                  {u.verified && (
                    <span className="text-[10px] font-bold px-1.5 py-px rounded border border-amber-700 bg-amber-50 text-amber-900">
                      本人確認済
                    </span>
                  )}
                  {u.is_beta_tester && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-px rounded border ${betaExpired ? "border-stone-300 bg-stone-100 text-stone-600" : "border-sky-300 bg-sky-50 text-sky-900"}`}
                    >
                      ベータ{betaExpired ? "(期限切れ)" : ""}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-px rounded border ${STATUS_BADGE[u.status]}`}
                  >
                    {u.status}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-xs text-foreground/60 break-all">
                登録、{new Date(u.created_at).toLocaleDateString("ja-JP")}
                {u.stripe_customer_id && ` ・ Stripe ${u.stripe_customer_id.slice(0, 14)}…`}
                {u.beta_grant_expires_at && (
                  <>
                    {" ・ "}ベータ期限、
                    {new Date(u.beta_grant_expires_at).toLocaleDateString("ja-JP")}
                  </>
                )}
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <Link
                  href={`/u/${u.id}`}
                  target="_blank"
                  className="inline-flex items-center min-h-[var(--spacing-tap)] px-3 rounded-full border border-border text-xs hover:bg-muted no-underline"
                >
                  プロフィール表示
                </Link>
                {!u.is_beta_tester && !u.is_ai_persona && (
                  <form action={grantBetaTester}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-3 rounded-full border border-sky-300 bg-sky-50 text-sky-900 text-xs hover:bg-sky-100"
                    >
                      ベータ特典を 1 年付与
                    </button>
                  </form>
                )}
                {u.status === "active" && !u.is_ai_persona && (
                  <form action={updateUserStatus}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="status" value="suspended" />
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-3 rounded-full border border-red-300 bg-red-50 text-red-900 text-xs hover:bg-red-100"
                    >
                      利用停止
                    </button>
                  </form>
                )}
                {u.status === "suspended" && (
                  <form action={updateUserStatus}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="status" value="active" />
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-3 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs hover:bg-emerald-100"
                    >
                      利用再開
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
