import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { featureResponse } from "@/app/topics/actions";

export const metadata: Metadata = { title: "お便り紹介" };

// お便り紹介の運用画面。
//
// ラジオのハガキ採用にあたる承認装置で、検証では採用された瞬間に
// 「（家族に）おい、俺の投稿が載っとるぞ」という反応が出た。
// 週に 1〜3 件を目安に、書いてくれた人が入れ替わるように選ぶ。
// 同じ人ばかり載せると、他の人が「常連の場だ」と感じて書かなくなる。

type Row = {
  id: string;
  topic_id: string;
  user_id: string;
  body: string;
  created_at: string;
  featured_at: string | null;
  featured_note: string | null;
};

export default async function AdminLettersPage() {
  await requireAdmin();
  const sb = getSupabaseAdminClient();

  const [{ data: featuredData }, { data: candidateData }] = await Promise.all([
    sb
      .from("topic_responses")
      .select("id, topic_id, user_id, body, created_at, featured_at, featured_note")
      .not("featured_at", "is", null)
      .order("featured_at", { ascending: false })
      .limit(50),
    sb
      .from("topic_responses")
      .select("id, topic_id, user_id, body, created_at, featured_at, featured_note")
      .is("featured_at", null)
      .is("parent_response_id", null)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const featured = ((featuredData ?? []) as unknown) as Row[];
  const candidates = ((candidateData ?? []) as unknown) as Row[];

  const userIds = Array.from(
    new Set([...featured, ...candidates].map((r) => r.user_id)),
  );
  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id, nickname")
    .in("user_id", userIds.slice(0, 300));
  const nameOf = new Map(
    ((profiles ?? []) as { user_id: string; nickname: string | null }[]).map(
      (p) => [p.user_id, p.nickname ?? "名無しの同級生"],
    ),
  );

  // すでに採用された人。偏りを避けるための目印
  const featuredUsers = new Set(featured.map((r) => r.user_id));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">お便り紹介</h1>
        <p className="mt-2 text-sm leading-7 text-foreground/70">
          週に1〜3件を目安に。同じ方が続かないよう、
          まだ載っていない方を優先して選んでください。
        </p>
      </header>

      <section>
        <h2 className="text-lg font-bold">紹介中（{featured.length} 件）</h2>
        <ul className="mt-3 space-y-3">
          {featured.length === 0 && (
            <li className="rounded-xl border border-border bg-background p-6 text-center text-foreground/70">
              まだ紹介はありません。
            </li>
          )}
          {featured.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-accent/50 bg-accent/5 p-4"
            >
              <p className="text-xs text-foreground/60">
                {nameOf.get(r.user_id)} さん
              </p>
              <p className="mt-1 text-base leading-8 whitespace-pre-wrap">
                {r.body}
              </p>
              {r.featured_note && (
                <p className="mt-2 rounded-lg bg-background px-3 py-2 text-sm leading-7">
                  {r.featured_note}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  href={`/topics/${r.topic_id}#response-${r.id}`}
                  className="text-sm no-underline hover:underline"
                >
                  お題を見る →
                </Link>
                <form action={featureResponse}>
                  <input type="hidden" name="response_id" value={r.id} />
                  <input type="hidden" name="unfeature" value="1" />
                  <input
                    type="hidden"
                    name="return_path"
                    value="/admin/letters"
                  />
                  <button
                    type="submit"
                    className="text-sm text-foreground/50 hover:text-notification"
                  >
                    紹介をやめる
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold">候補</h2>
        <ul className="mt-3 space-y-3">
          {candidates.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <p className="text-xs text-foreground/60">
                {nameOf.get(r.user_id)} さん
                {featuredUsers.has(r.user_id) && (
                  <span className="ml-2 text-accent">（採用済みの方）</span>
                )}
              </p>
              <p className="mt-1 text-base leading-8 whitespace-pre-wrap">
                {r.body}
              </p>
              <form action={featureResponse} className="mt-3 space-y-2">
                <input type="hidden" name="response_id" value={r.id} />
                <input type="hidden" name="return_path" value="/admin/letters" />
                <input
                  type="text"
                  name="note"
                  maxLength={300}
                  placeholder="添える一言（任意）"
                  className="w-full px-3 py-2 rounded border border-border bg-page text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[var(--spacing-tap)] px-5 rounded-full bg-accent text-white text-sm font-bold"
                >
                  今週のお便りに選ぶ
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
