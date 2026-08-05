import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAuthorInfo } from "@/lib/author-info";
import { UserAvatar } from "@/components/user-avatar";
import { MembershipBadge } from "@/components/membership-badge";

export const metadata: Metadata = {
  title: "みんなの新着",
  description: "同じ学年の人たちが、いま書いていることの新着です。",
};

// 新着。
//
// ホームはお題ごとに並ぶので、時系列で「いま誰かが書いている」ことが見える場所を別に置く。
// 立ち上げ期にとくに効く画面で、検証では「お、ちゃんと人がおるやんか」という
// 一言が出るかどうかが、その後読み続けるかどうかを分けていた。
export default async function TimelinePage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("topic_responses")
    .select("id, topic_id, user_id, body, created_at, is_operator, featured_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as {
    id: string;
    topic_id: string;
    user_id: string;
    body: string;
    created_at: string;
    is_operator: boolean;
    featured_at: string | null;
  }[];

  const [authors, { data: topics }] = await Promise.all([
    fetchAuthorInfo(
      supabase,
      rows.map((r) => r.user_id),
    ),
    supabase
      .from("topics")
      .select("id, title")
      .in("id", Array.from(new Set(rows.map((r) => r.topic_id)))),
  ]);

  const titleOf = new Map(
    ((topics ?? []) as { id: string; title: string }[]).map((t) => [
      t.id,
      t.title,
    ]),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">みんなの新着</h1>
        <p className="mt-2 text-base leading-8 text-foreground/80">
          同じ学年の人たちが、いま書いていることです。
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-6">
          <p className="text-base leading-8">
            まだ何もありません。最初の一行を置いていきませんか。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-bold no-underline"
          >
            今週のお題を見る
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const a = authors.get(r.user_id);
            return (
              <li key={r.id}>
                <Link
                  href={`/topics/${r.topic_id}#response-${r.id}`}
                  className="block rounded-2xl border border-border/60 bg-background p-4 no-underline hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={a?.nickname ?? "名無しの同級生"}
                      avatarUrl={a?.avatarUrl ?? null}
                      size={32}
                    />
                    <span className="text-sm font-bold text-foreground">
                      {a?.nickname ?? "名無しの同級生"}
                    </span>
                    <MembershipBadge
                      isOperator={r.is_operator}
                      isFoundingMember={a?.isFoundingMember}
                    />
                    {r.featured_at && (
                      <span className="ml-auto text-[11px] font-bold text-accent">
                        お便り紹介
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-base leading-8 text-foreground line-clamp-3">
                    {r.body}
                  </p>
                  <p className="mt-1.5 text-xs text-foreground/50">
                    お題「{titleOf.get(r.topic_id) ?? "—"}」
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
