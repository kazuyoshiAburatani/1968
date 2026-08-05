import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAuthorInfo } from "@/lib/author-info";

// 「今週のお便り」。運営が採用した投稿を掲げる場所。
//
// ラジオのハガキ採用にあたる承認装置で、検証では採用された瞬間に
// 「（家族に）おい、俺の投稿が載っとるぞ」という反応が出て、
// そこで初めてお金を払ってもいいという気持ちが生まれていた。
// 採用が 1 件も無いうちは、何も出さない（空の枠は場の寂しさを強調してしまう）。
export async function FeaturedLetters() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("topic_responses")
    .select("id, user_id, body, featured_note, featured_at, topic_id")
    .not("featured_at", "is", null)
    .order("featured_at", { ascending: false })
    .limit(3);

  const rows = (data ?? []) as {
    id: string;
    user_id: string;
    body: string;
    featured_note: string | null;
    topic_id: string;
  }[];

  if (rows.length === 0) return null;

  const authors = await fetchAuthorInfo(
    supabase,
    rows.map((r) => r.user_id),
  );

  return (
    <section className="rounded-2xl border-2 border-accent/50 bg-accent/5 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-bold text-accent">
        <i className="ri-mail-star-line text-base" aria-hidden />
        今週のお便り
      </div>
      <p className="mt-1.5 text-sm leading-7 text-foreground/70">
        いただいた中から、運営が読ませていただいたものです。
      </p>

      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-border/60 bg-background p-4"
          >
            <p className="text-base leading-8 whitespace-pre-wrap">{r.body}</p>
            <p className="mt-2 text-sm text-foreground/60">
              — {authors.get(r.user_id)?.nickname ?? "名無しの同級生"} さん
            </p>
            {r.featured_note && (
              <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-7 text-foreground/80">
                {r.featured_note}
              </p>
            )}
            <Link
              href={`/topics/${r.topic_id}#response-${r.id}`}
              className="mt-2 inline-block text-sm no-underline hover:underline"
            >
              このお題を見る →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
