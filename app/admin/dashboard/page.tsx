import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "ダッシュボード" };

// 運営ダッシュボード。
//
// 追う数字を絞ってある。会員数の絶対値ではなく、
//   ・書いた人が何人いるか（投稿者数）
//   ・書いた投稿に、ちゃんと返事が返っているか（未返信件数）
//   ・お題と二択の仕込みが切れていないか
// の 3 つが、この時期にいちばん効く指標になる。
export default async function AdminDashboardPage() {
  const sb = getSupabaseAdminClient();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const sevenDaysAgo = new Date(
    nowDate.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    users,
    profiles,
    responses,
    responses7d,
    votes,
    quizAttempts,
    topicsLive,
    topicsQueued,
    pollsLive,
    pollsQueued,
    reportsOpen,
    featured,
  ] = await Promise.all([
    sb.from("users").select("id", { count: "exact", head: true }),
    sb.from("profiles").select("user_id", { count: "exact", head: true }),
    sb.from("topic_responses").select("id", { count: "exact", head: true }),
    sb
      .from("topic_responses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    sb.from("poll_votes").select("poll_id", { count: "exact", head: true }),
    sb.from("quiz_attempts").select("id", { count: "exact", head: true }),
    sb
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("published_at", now),
    sb
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("published_at", now),
    sb
      .from("polls")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("published_at", now),
    sb
      .from("polls")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("published_at", now),
    sb
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "未対応"),
    sb
      .from("topic_responses")
      .select("id", { count: "exact", head: true })
      .not("featured_at", "is", null),
  ]);

  // 未返信、トップレベル投稿のうち返信が 1 件も付いていないもの
  const { data: topLevel } = await sb
    .from("topic_responses")
    .select("id")
    .is("parent_response_id", null)
    .limit(1000);
  const topIds = ((topLevel ?? []) as { id: string }[]).map((r) => r.id);

  let unanswered = 0;
  if (topIds.length > 0) {
    const { data: withReplies } = await sb
      .from("topic_responses")
      .select("parent_response_id")
      .not("parent_response_id", "is", null);
    const answered = new Set(
      ((withReplies ?? []) as { parent_response_id: string }[]).map(
        (r) => r.parent_response_id,
      ),
    );
    unanswered = topIds.filter((id) => !answered.has(id)).length;
  }

  // 書いた人の数
  const { data: posters } = await sb
    .from("topic_responses")
    .select("user_id")
    .limit(5000);
  const posterCount = new Set(
    ((posters ?? []) as { user_id: string }[]).map((r) => r.user_id),
  ).size;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <section>
        <h2 className="text-lg font-bold">まず見るところ</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat
            label="未返信の投稿"
            value={unanswered}
            tone={unanswered > 0 ? "alert" : "ok"}
            note={
              unanswered > 0
                ? "今日じゅうに返してください"
                : "すべて返信済みです"
            }
            href="/admin/replies"
          />
          <Stat
            label="書いた人"
            value={posterCount}
            note={`登録 ${profiles.count ?? 0} 人のうち`}
          />
          <Stat
            label="今週の投稿"
            value={responses7d.count ?? 0}
            note="直近7日"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">配信の仕込み</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stat
            label="お題、配信待ち"
            value={topicsQueued.count ?? 0}
            tone={(topicsQueued.count ?? 0) < 4 ? "alert" : "ok"}
            note={`公開中 ${topicsLive.count ?? 0} 件。4件を切ったら足す`}
            href="/admin/topics"
          />
          <Stat
            label="二択、配信待ち"
            value={pollsQueued.count ?? 0}
            tone={(pollsQueued.count ?? 0) < 4 ? "alert" : "ok"}
            note={`公開中 ${pollsLive.count ?? 0} 件。4件を切ったら足す`}
            href="/admin/polls"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">全体</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="登録者" value={users.count ?? 0} />
          <Stat label="投稿・返信の総数" value={responses.count ?? 0} />
          <Stat label="投票された数" value={votes.count ?? 0} />
          <Stat label="検定の挑戦" value={quizAttempts.count ?? 0} />
          <Stat
            label="お便り紹介"
            value={featured.count ?? 0}
            href="/admin/letters"
          />
          <Stat
            label="未対応の違反報告"
            value={reportsOpen.count ?? 0}
            tone={(reportsOpen.count ?? 0) > 0 ? "alert" : "ok"}
            href="/admin/reports"
          />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "ok",
  href,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "ok" | "alert";
  href?: string;
}) {
  const inner = (
    <div
      className={
        "rounded-2xl border p-4 h-full " +
        (tone === "alert"
          ? "border-notification/50 bg-notification/5"
          : "border-border bg-background")
      }
    >
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-foreground/60">{note}</p>}
    </div>
  );

  return href ? (
    <Link href={href} className="no-underline text-foreground">
      {inner}
    </Link>
  ) : (
    inner
  );
}
