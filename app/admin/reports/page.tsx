import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateReportStatus } from "./actions";

export const metadata: Metadata = { title: "違反報告" };

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  handled_at: string | null;
  handled_by: string | null;
  created_at: string;
};

type Props = {
  searchParams: Promise<{ filter?: "open" | "all" }>;
};

export default async function AdminReportsPage({ searchParams }: Props) {
  const { filter = "open" } = await searchParams;
  const admin = getSupabaseAdminClient();

  let query = admin
    .from("reports")
    .select(
      "id, reporter_id, target_type, target_id, reason, status, handled_at, handled_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "open") {
    query = query.neq("status", "完了");
  }

  const { data } = await query;
  const reports = (data ?? []) as Report[];

  // 報告者のニックネーム
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
  const profiles =
    reporterIds.length > 0
      ? (
          await admin
            .from("profiles")
            .select("user_id, nickname")
            .in("user_id", reporterIds)
        ).data ?? []
      : [];
  const nickMap = new Map(
    profiles.map((p: { user_id: string; nickname: string }) => [
      p.user_id,
      p.nickname,
    ]),
  );

  // 対象スレッド／返信のタイトル取得
  const threadIds = reports
    .filter((r) => r.target_type === "thread")
    .map((r) => r.target_id);
  const replyIds = reports
    .filter((r) => r.target_type === "reply")
    .map((r) => r.target_id);
  const [{ data: threads }, { data: replies }] = await Promise.all([
    threadIds.length > 0
      ? admin
          .from("threads")
          .select("id, title, body, category_id, categories(slug)")
          .in("id", threadIds)
      : Promise.resolve({ data: [] }),
    replyIds.length > 0
      ? admin
          .from("replies")
          .select("id, body, thread_id, threads(category_id, categories(slug))")
          .in("id", replyIds)
      : Promise.resolve({ data: [] }),
  ]);
  const threadMap = new Map(
    (threads ?? []).map((t: { id: string }) => [t.id, t]),
  );
  const replyMap = new Map((replies ?? []).map((r: { id: string }) => [r.id, r]));

  return (
    <div>
      <h1 className="text-2xl font-bold">違反報告一覧</h1>

      <nav className="mt-3 flex gap-2 text-sm">
        {(["open", "all"] as const).map((k) => (
          <a
            key={k}
            href={`/admin/reports?filter=${k}`}
            className={`px-3 py-1 rounded-full border ${filter === k ? "border-primary bg-primary/10 text-primary font-bold" : "border-border hover:bg-muted"} no-underline`}
          >
            {k === "open" ? "未対応・対応中" : "すべて"}
          </a>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p className="mt-12 text-center text-foreground/70">
          {filter === "open"
            ? "対応待ちの報告はありません。"
            : "報告はありません。"}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reports.map((r) => {
            const thread =
              r.target_type === "thread"
                ? (threadMap.get(r.target_id) as
                    | {
                        title: string;
                        body: string;
                        categories: { slug: string };
                      }
                    | undefined)
                : null;
            const reply =
              r.target_type === "reply"
                ? (replyMap.get(r.target_id) as
                    | {
                        body: string;
                        thread_id: string;
                        threads: { categories: { slug: string } };
                      }
                    | undefined)
                : null;

            const targetUrl = thread
              ? `/board/${thread.categories.slug}/${r.target_id}`
              : reply
                ? `/board/${reply.threads.categories.slug}/${reply.thread_id}#reply-${r.target_id}`
                : null;

            return (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-background p-5"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-xs text-foreground/60">
                      {r.target_type === "thread"
                        ? "スレッド"
                        : r.target_type === "reply"
                          ? "返信"
                          : r.target_type}{" "}
                      の通報
                    </p>
                    <p className="font-bold mt-1">
                      {thread?.title ?? "（タイトルなし）"}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded border border-stone-300 bg-stone-50 text-stone-700">
                    {r.status}
                  </span>
                </div>

                <p className="mt-3 text-sm whitespace-pre-wrap leading-7 bg-muted/30 p-3 rounded">
                  {(thread?.body ?? reply?.body ?? "(本文取得不可)").slice(0, 240)}
                </p>

                <div className="mt-3 text-xs text-foreground/60">
                  通報者、{nickMap.get(r.reporter_id) ?? r.reporter_id.slice(0, 8)}
                  {" ・ "}
                  通報日時、{new Date(r.created_at).toLocaleString("ja-JP")}
                  {r.reason && (
                    <>
                      <br />
                      理由、{r.reason}
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  {targetUrl && (
                    <Link
                      href={targetUrl}
                      target="_blank"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm hover:bg-muted no-underline"
                    >
                      対象を開く
                    </Link>
                  )}
                  {r.status !== "対応中" && (
                    <form action={updateReportStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="対応中" />
                      <button
                        type="submit"
                        className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm hover:bg-muted"
                      >
                        対応中にする
                      </button>
                    </form>
                  )}
                  {r.status !== "完了" && (
                    <form action={updateReportStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="完了" />
                      <button
                        type="submit"
                        className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90"
                      >
                        完了にする
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
