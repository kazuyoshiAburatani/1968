import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAuthorInfo } from "@/lib/author-info";

export const metadata: Metadata = {
  title: "お便り紹介",
  description:
    "いただいた投稿の中から、運営が読ませていただいたものをご紹介しています。",
};

// お便り紹介のバックナンバー。
// ラジオの「今週のお便り」にあたる承認装置で、載ったことが本人に見える形で残るのが要点。
export default async function LettersPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("topic_responses")
    .select("id, user_id, body, featured_note, featured_at, topic_id")
    .not("featured_at", "is", null)
    .order("featured_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as {
    id: string;
    user_id: string;
    body: string;
    featured_note: string | null;
    featured_at: string;
    topic_id: string;
  }[];

  const authors = await fetchAuthorInfo(
    supabase,
    rows.map((r) => r.user_id),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
          お便り紹介
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/80">
          いただいた投稿の中から、運営が読ませていただいたものです。
          お名前はニックネームのままで載せています。
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm leading-7 text-foreground/60">
          まだ紹介はありません。お題への一言、お待ちしています。
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const at = new Date(r.featured_at);
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border/60 bg-background p-5"
              >
                <p className="text-xs text-foreground/50">
                  {at.getFullYear()}年{at.getMonth() + 1}月{at.getDate()}日 紹介
                </p>
                <p className="mt-2 text-base leading-8 whitespace-pre-wrap">
                  {r.body}
                </p>
                <p className="mt-2 text-sm text-foreground/60">
                  — {authors.get(r.user_id)?.nickname ?? "名無しの同級生"} さん
                </p>
                {r.featured_note && (
                  <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-7">
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
