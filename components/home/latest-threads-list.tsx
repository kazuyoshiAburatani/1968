import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tier } from "@/lib/auth/permissions";

// ダッシュボード共通の「最新スレッド」リスト。
// RLS でランク別にフィルタされるため、呼び出し側でランクを気にする必要はない。

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
  like_count: number;
  user_id: string;
  categories: { slug: string; name: string; tier: Tier } | null;
};

const TIER_COLORS: Record<Tier, string> = {
  A: "bg-muted text-foreground",
  B: "bg-accent/20 text-accent",
  C: "bg-primary/20 text-primary",
  D: "bg-primary text-white",
};

export async function LatestThreadsList({ limit = 10 }: { limit?: number }) {
  const supabase = await createSupabaseServerClient();
  const { data: threads } = await supabase
    .from("threads")
    .select(
      "id, title, body, created_at, reply_count, like_count, user_id, categories(slug, name, tier)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (threads ?? []) as unknown as ThreadRow[];

  // 作者ニックネーム
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const nickMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      nickMap.set(p.user_id as string, p.nickname as string);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        まだ投稿がありません。最初の一歩を書いてみませんか？
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((t) => {
        const nickname = nickMap.get(t.user_id) ?? "（匿名）";
        const tier = t.categories?.tier ?? "A";
        return (
          <li key={t.id} className="py-3">
            <Link
              href={`/board/${t.categories?.slug}/${t.id}`}
              className="block no-underline hover:bg-muted/40 -mx-2 px-2 py-1 rounded"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={
                    "text-xs font-bold px-2 py-0.5 rounded-full " +
                    TIER_COLORS[tier]
                  }
                >
                  {t.categories?.name}
                </span>
              </div>
              <p className="mt-1 font-bold">{t.title}</p>
              <p className="mt-0.5 text-xs text-foreground/60">
                {nickname} ・ {new Date(t.created_at).toLocaleDateString("ja-JP")} ・
                返信{t.reply_count} ・ いいね{t.like_count}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
