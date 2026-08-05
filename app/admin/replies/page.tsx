import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { replyAsOperator } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "未返信" };

// 未返信キュー。運営の毎日の作業場。
//
// 検証で定着スコアが最も高かったのは「投稿すると必ず運営から返事が来る」ことだった。
// ただし条件があって、返信の固有名詞の密度が命になる。
// 「素敵な思い出ですね！」のような定型文は一発でテンプレだと見抜かれ、
// 「botやろこれ」と言われて逆効果になった。
// 刺さったのは「ブーメランストリートとは渋い。私はヤングマン派でした」のように、
// 相手が書いた固有名詞を受けて、こちらの記憶を返すやり方。
//
// この画面はその作業を 24 時間以内に終えるためにある。
type Row = {
  id: string;
  topic_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default async function AdminRepliesPage() {
  await requireAdmin();
  const sb = getSupabaseAdminClient();

  const { data: topData } = await sb
    .from("topic_responses")
    .select("id, topic_id, user_id, body, created_at")
    .is("parent_response_id", null)
    .order("created_at", { ascending: true })
    .limit(300);
  const tops = ((topData ?? []) as unknown) as Row[];

  const { data: replyData } = await sb
    .from("topic_responses")
    .select("parent_response_id")
    .not("parent_response_id", "is", null);
  const answered = new Set(
    ((replyData ?? []) as { parent_response_id: string }[]).map(
      (r) => r.parent_response_id,
    ),
  );

  const pending = tops.filter((r) => !answered.has(r.id));
  const nowMs = new Date().getTime();

  // ニックネームとお題の見出し
  const [{ data: profiles }, { data: topics }] = await Promise.all([
    sb
      .from("profiles")
      .select("user_id, nickname, prefecture")
      .in("user_id", Array.from(new Set(pending.map((r) => r.user_id))).slice(0, 300)),
    sb
      .from("topics")
      .select("id, title")
      .in("id", Array.from(new Set(pending.map((r) => r.topic_id))).slice(0, 300)),
  ]);

  const nameOf = new Map(
    ((profiles ?? []) as { user_id: string; nickname: string | null; prefecture: string | null }[]).map(
      (p) => [p.user_id, p],
    ),
  );
  const titleOf = new Map(
    ((topics ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title]),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">未返信</h1>
        <p className="mt-2 text-sm leading-7 text-foreground/70">
          返事がまだ付いていない投稿です。24時間以内に返すのが目安。
          <br />
          相手が書いた固有名詞を必ず拾って、こちらの記憶を返してください。
          定型文だと一目で分かってしまい、逆効果になります。
        </p>
      </header>

      {pending.length === 0 ? (
        <p className="rounded-2xl border border-primary/40 bg-primary/5 px-4 py-6 text-center text-base">
          すべて返信済みです。
        </p>
      ) : (
        <>
          <p className="text-sm font-bold text-notification">
            {pending.length} 件、返事を待っています
          </p>
          <ul className="space-y-4">
            {pending.map((r) => {
              const p = nameOf.get(r.user_id);
              const elapsedH = Math.floor(
                (nowMs - new Date(r.created_at).getTime()) / 3600000,
              );
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-2 text-xs text-foreground/60">
                    <span className="font-bold text-foreground">
                      {p?.nickname ?? "名無しの同級生"}
                    </span>
                    {p?.prefecture && <span>{p.prefecture}</span>}
                    <span
                      className={
                        elapsedH >= 24 ? "font-bold text-notification" : ""
                      }
                    >
                      {elapsedH} 時間経過
                    </span>
                    <Link
                      href={`/topics/${r.topic_id}#response-${r.id}`}
                      className="ml-auto no-underline hover:underline"
                    >
                      お題「{titleOf.get(r.topic_id) ?? "—"}」
                    </Link>
                  </div>

                  <p className="mt-2 text-base leading-8 whitespace-pre-wrap">
                    {r.body}
                  </p>

                  <form action={replyAsOperator} className="mt-3 space-y-2">
                    <input type="hidden" name="parent_response_id" value={r.id} />
                    <input type="hidden" name="topic_id" value={r.topic_id} />
                    <textarea
                      name="body"
                      rows={2}
                      required
                      maxLength={1000}
                      placeholder="相手の言葉を拾って、こちらの記憶を返す"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-base leading-8"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <SubmitButton className="min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-bold">
                        運営として返す
                      </SubmitButton>
                      <label className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="feature" className="size-4" />
                        「今週のお便り」にも選ぶ
                      </label>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
