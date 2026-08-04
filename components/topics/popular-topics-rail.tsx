import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 人気のお題、直近アクティブな topic を回答数の多い順に。
// トップ 4 件までカード表示、タップで /topics/[id] へ。

type Row = {
  id: string;
  title: string;
  body: string;
  responseCount: number;
};

export async function PopularTopicsRail({ limit = 4 }: { limit?: number }) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  // 現在アクティブなお題を候補として、期間内のものだけ人気ランキング対象に
  const { data: topicsData } = await supabase
    .from("topics")
    .select("id, title, body")
    .eq("is_active", true)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .limit(20);
  const topics = (topicsData ?? []) as {
    id: string;
    title: string;
    body: string;
  }[];

  if (topics.length === 0) return null;

  // 各お題の回答数（返信含む）を一括で。target_id in (...) のクエリで
  // 全レス取得→アプリ側で集計。母数がそう多くない前提。
  const topicIds = topics.map((t) => t.id);
  const { data: allResponses } = await supabase
    .from("topic_responses")
    .select("topic_id")
    .in("topic_id", topicIds);

  const countByTopic = new Map<string, number>();
  for (const r of allResponses ?? []) {
    const tid = r.topic_id as string;
    countByTopic.set(tid, (countByTopic.get(tid) ?? 0) + 1);
  }

  const ranked: Row[] = topics
    .map((t) => ({
      id: t.id,
      title: t.title,
      body: t.body,
      responseCount: countByTopic.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.responseCount - a.responseCount)
    .slice(0, limit);

  if (ranked.every((r) => r.responseCount === 0)) {
    // 全部 0 件だと「人気」というより単なる新着なので、ラベルを変える
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <i className="ri-chat-quote-line text-primary" aria-hidden />
            話題のお題
          </h2>
        </div>
        <PopularGrid rows={ranked} />
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <i
            className="ri-fire-fill text-[color:var(--color-notification)]"
            aria-hidden
          />
          人気のお題
        </h2>
      </div>
      <PopularGrid rows={ranked} />
    </section>
  );
}

function PopularGrid({ rows }: { rows: Row[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link
            href={`/topics/${r.id}`}
            className="block bg-background rounded-2xl p-4 shadow-sm border border-border/60 hover:shadow-md hover:border-primary/40 transition-all no-underline h-full"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`shrink-0 text-2xl font-bold w-8 leading-8 text-center ${
                  i === 0
                    ? "text-primary"
                    : i === 1
                      ? "text-primary/70"
                      : "text-foreground/30"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-snug text-foreground line-clamp-2">
                  {r.title}
                </h3>
                {r.body && (
                  <p className="mt-1 text-xs text-foreground/60 line-clamp-1">
                    {r.body}
                  </p>
                )}
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium">
                  <i className="ri-chat-3-line" aria-hidden />
                  {r.responseCount} 件の答え
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
