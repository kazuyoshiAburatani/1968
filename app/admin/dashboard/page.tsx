import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "ダッシュボード" };

export default async function AdminDashboardPage() {
  const admin = getSupabaseAdminClient();

  // 各テーブルの件数を集計
  const [
    usersTotal,
    usersRegular,
    usersMember,
    usersBeta,
    usersVerified,
    threadsTotal,
    repliesTotal,
    appsTotal,
    appsPending,
    verifPending,
    verifApproved,
    reportsOpen,
  ] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("membership_rank", "verified"),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("membership_rank", "member"),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_beta_tester", true),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("verified", true),
    admin.from("threads").select("id", { count: "exact", head: true }),
    admin.from("replies").select("id", { count: "exact", head: true }),
    admin
      .from("beta_applications")
      .select("id", { count: "exact", head: true }),
    admin
      .from("beta_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .neq("status", "完了"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <p className="mt-2 text-sm text-foreground/70">
        サービス全体の状況を一目で確認できます。
      </p>

      <section className="mt-8">
        <h2 className="font-bold">会員</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="登録者数" value={usersTotal.count ?? 0} />
          <Stat label="正会員" value={usersRegular.count ?? 0} accent />
          <Stat label="無料会員" value={usersMember.count ?? 0} />
          <Stat label="本人確認済" value={usersVerified.count ?? 0} />
          <Stat label="ベータ特典中" value={usersBeta.count ?? 0} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-bold">投稿</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="スレッド" value={threadsTotal.count ?? 0} />
          <Stat label="返信" value={repliesTotal.count ?? 0} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-bold">運営対応</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat
            label="ベータ応募 未対応"
            value={appsPending.count ?? 0}
            accent={!!(appsPending.count && appsPending.count > 0)}
          />
          <Stat label="ベータ応募 累計" value={appsTotal.count ?? 0} />
          <Stat
            label="身分証 審査中"
            value={verifPending.count ?? 0}
            accent={!!(verifPending.count && verifPending.count > 0)}
          />
          <Stat label="身分証 承認済" value={verifApproved.count ?? 0} />
          <Stat
            label="違反報告 未対応"
            value={reportsOpen.count ?? 0}
            accent={!!(reportsOpen.count && reportsOpen.count > 0)}
          />
        </div>
      </section>

      <p className="mt-10 text-xs text-foreground/60">
        ※ 集計値はリアルタイムです。ページをリロードで最新化されます。
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}
    >
      <p className="text-xs text-foreground/60">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
