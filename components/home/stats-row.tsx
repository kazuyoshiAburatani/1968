import { createSupabaseServerClient } from "@/lib/supabase/server";

// ホーム上部の KPI カード群。実データをリアルタイムに近い形で表示する。
// キャッシュ回避、Supabase Realtime は使わずページロード時に集計するだけ、
// 数値のズレは 5 分程度まで許容（トップページは高頻度アクセスされる想定）。

type Item = {
  icon: string; // ri-*
  label: string;
  value: string;
  bgClass: string; // アイコン背景（Tailwind クラス）
  fgClass: string; // アイコン色（Tailwind クラス）
};

export async function StatsRow() {
  const supabase = await createSupabaseServerClient();

  // 総メンバー数、profiles テーブル件数（プロフィール作成 = 実質的なアクティブ登録）
  const { count: memberCount } = await supabase
    .from("profiles")
    .select("user_id", { count: "exact", head: true });

  // 今日の投稿数、直近 24 時間の threads と replies を合算
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: threadsToday } = await supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  const { count: repliesToday } = await supabase
    .from("replies")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  const postsToday = (threadsToday ?? 0) + (repliesToday ?? 0);

  // アクティブな話題、直近 7 日間で新規返信のあったスレッド数
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activeRows } = await supabase
    .from("replies")
    .select("thread_id")
    .gte("created_at", week);
  const activeThreadIds = new Set(
    (activeRows ?? []).map((r) => r.thread_id as string),
  );

  // 今週のお題（次回イベント枠の代替）、published_at 直近の 1 件
  const now = new Date().toISOString();
  const { data: topic } = await supabase
    .from("topics")
    .select("title, published_at, expires_at")
    .eq("is_active", true)
    .lte("published_at", now)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const topicLabel = topic
    ? topic.title.length > 12
      ? `${topic.title.slice(0, 11)}…`
      : topic.title
    : "未配信";

  const items: Item[] = [
    {
      icon: "ri-group-line",
      label: "総メンバー数",
      value: (memberCount ?? 0).toLocaleString(),
      bgClass: "bg-primary/10",
      fgClass: "text-primary",
    },
    {
      icon: "ri-chat-3-line",
      label: "今日の投稿数",
      value: postsToday.toLocaleString(),
      bgClass: "bg-accent/15",
      fgClass: "text-accent",
    },
    {
      icon: "ri-fire-line",
      label: "アクティブな話題",
      value: activeThreadIds.size.toLocaleString(),
      bgClass: "bg-emerald-100",
      fgClass: "text-emerald-700",
    },
    {
      icon: "ri-lightbulb-line",
      label: "今週のお題",
      value: topicLabel,
      bgClass: "bg-amber-100",
      fgClass: "text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="bg-background rounded-xl p-4 sm:p-5 shadow-sm border border-border/60 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-lg ${it.bgClass} ${it.fgClass}`}
            >
              <i className={`${it.icon} text-xl`} />
            </span>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-bold truncate">
                {it.value}
              </div>
              <div className="text-xs text-foreground/60 truncate">
                {it.label}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
