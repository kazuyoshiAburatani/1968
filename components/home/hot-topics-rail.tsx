import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 今週のホットトピック、直近 7 日間のいいね + 返信数で上位 5 スレッド。
// 数値はキャッシュされるが、集計クエリは軽量なのでページロード都度実行して問題ない。

type Row = {
  id: string;
  title: string;
  category_slug: string;
  like_count: number;
  reply_count: number;
};

export async function HotTopicsRail() {
  const supabase = await createSupabaseServerClient();
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("threads")
    .select("id, title, like_count, reply_count, categories(slug)")
    .gte("created_at", week)
    .order("like_count", { ascending: false })
    .order("reply_count", { ascending: false })
    .limit(5);

  const rows: Row[] = (data ?? []).map((t) => {
    const cat = t.categories as { slug?: string } | null;
    return {
      id: t.id as string,
      title: t.title as string,
      category_slug: cat?.slug ?? "",
      like_count: (t.like_count as number) ?? 0,
      reply_count: (t.reply_count as number) ?? 0,
    };
  });

  return (
    <div className="bg-background rounded-xl p-5 shadow-sm border border-border/60">
      <div className="flex items-center gap-2 mb-4">
        <i
          className="ri-fire-fill text-xl text-[color:var(--color-notification)]"
          aria-hidden
        />
        <h3 className="font-bold">今週のホットトピック</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground/60">
          まだ話題がありません、最初の投稿をしてみませんか。
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/board/${r.category_slug}/${r.id}`}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/60 transition-colors no-underline"
              >
                <span
                  aria-hidden
                  className={`shrink-0 text-xl font-bold w-6 text-center leading-6 ${
                    i === 0 ? "text-primary" : "text-foreground/30"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                    {r.title}
                  </div>
                  <div className="mt-1 text-xs text-foreground/60">
                    {r.like_count + r.reply_count}件の反応
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
