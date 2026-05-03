import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAuthorInfo } from "@/lib/author-info";
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

// 段階別にバッジの色を変える、段階が上がるほど紺寄りに濃くなる階調
const TIER_BADGE: Record<Tier, string> = {
  A: "bg-muted text-foreground",
  B: "bg-accent/20 text-accent",
  C: "bg-primary/15 text-primary",
  D: "bg-primary text-white",
  L: "bg-amber-100 text-amber-900",
};

const TIER_LABEL: Record<Tier, string> = {
  A: "段階A",
  B: "段階B",
  C: "段階C",
  D: "段階D",
  L: "ラウンジ",
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
  const authorMap = await fetchAuthorInfo(
    supabase,
    rows.map((r) => r.user_id),
  );

  if (rows.length === 0) {
    return (
      <p className="py-6 text-sm text-foreground/60 text-center">
        まだ投稿がありません。最初の一歩を書いてみませんか？
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((t) => {
        const author = authorMap.get(t.user_id);
        const nickname = author?.nickname ?? "（匿名）";
        const rank = author?.rank ?? "member";
        const tier = t.categories?.tier ?? "A";
        return (
          <li key={t.id} className="py-4 first:pt-0 last:pb-0">
            <Link
              href={`/board/${t.categories?.slug}/${t.id}`}
              className="block no-underline hover:bg-muted/30 -mx-3 px-3 py-1 rounded"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={
                    "text-xs font-bold px-2 py-0.5 rounded " + TIER_BADGE[tier]
                  }
                >
                  {TIER_LABEL[tier]}
                </span>
                <span className="text-xs text-foreground/60">
                  {t.categories?.name}
                </span>
              </div>
              <h3 className="mt-1.5 font-bold text-foreground leading-snug">
                {t.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-foreground/60 flex-wrap">
                <span className="flex items-center gap-1.5">
                  {nickname}
                  {author?.isAi ? (
                    <span className="inline-block px-1.5 py-px rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      運営AI
                    </span>
                  ) : rank === "verified" ? (
                    <span className="inline-block px-1.5 py-px rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/30">
                      正会員
                    </span>
                  ) : rank === "member" ? (
                    <span className="inline-block px-1.5 py-px rounded text-[10px] font-medium bg-muted text-foreground/70 border border-border">
                      会員
                    </span>
                  ) : null}
                </span>
                <span>{new Date(t.created_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="inline-flex items-center gap-1">
                  <i className="ri-message-2-line" aria-hidden />
                  {t.reply_count}
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="ri-heart-line" aria-hidden />
                  {t.like_count}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
