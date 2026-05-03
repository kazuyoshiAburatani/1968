import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAllCategories } from "@/lib/cached-categories";

// 「今週のお題」の最新 1 件を表示するカード。
// audience に応じて RLS が自動でフィルタするので、見える人にだけ表示される。
// 何もアクティブが無ければ何もレンダリングしない（null 返り）。

type Topic = {
  id: string;
  title: string;
  body: string;
  related_category_id: number | null;
  published_at: string;
};

export async function CurrentTopic() {
  const supabase = await createSupabaseServerClient();

  let topic: Topic | null = null;
  try {
    const { data } = await supabase
      .from("topics")
      .select("id, title, body, related_category_id, published_at")
      .lte("published_at", new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    topic = data as Topic | null;
  } catch {
    // テーブル未適用、何も表示しない
    return null;
  }

  if (!topic) return null;

  const cats = await fetchAllCategories();
  const cat = topic.related_category_id
    ? cats.find((c) => c.id === topic!.related_category_id)
    : null;

  return (
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
        <i className="ri-chat-quote-line text-base" aria-hidden />
        今週のお題
      </div>
      <h3 className="mt-2 text-lg sm:text-xl font-bold text-amber-900 leading-snug">
        {topic.title}
      </h3>
      {topic.body && (
        <p className="mt-2 text-sm text-foreground/80 leading-7 whitespace-pre-wrap">
          {topic.body}
        </p>
      )}
      {cat && (
        <p className="mt-4">
          <Link
            href={`/board/${cat.slug}/new`}
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-amber-700 text-white text-sm font-medium no-underline active:opacity-90"
          >
            「{cat.name}」に投稿する →
          </Link>
        </p>
      )}
    </section>
  );
}
