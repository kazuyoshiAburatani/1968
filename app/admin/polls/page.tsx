import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { TOPIC_ERA_VALUES } from "@/lib/validation/topic";
import { createPoll, deletePoll, updatePoll } from "./actions";

export const metadata: Metadata = { title: "二択の配信" };

type Poll = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  blurb: string;
  era: string | null;
  gender_lean: "male" | "female" | "both";
  published_at: string;
  expires_at: string | null;
  is_active: boolean;
};

type Props = {
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
};

// 二択の配信管理。
//
// 運用で守ること、
//  ・男性寄りと女性寄りを交互に出す。連続すると片方の性別の参加が止まる
//  ・全世代ネタ（きのこたけのこ等）は出さない。「うちの世代でやる意味ある？」と白ける
//  ・4 週間先まで仕込んでおく
export default async function AdminPollsPage({ searchParams }: Props) {
  await requireAdmin();
  const { saved, error, edit } = await searchParams;
  const sb = getSupabaseAdminClient();

  const { data } = await sb
    .from("polls")
    .select(
      "id, question, option_a, option_b, blurb, era, gender_lean, published_at, expires_at, is_active",
    )
    .order("published_at", { ascending: false })
    .limit(200);

  const polls = ((data ?? []) as unknown) as Poll[];
  const editing = edit ? polls.find((p) => p.id === edit) : undefined;

  // 投票数
  const { data: voteData } = await sb.from("poll_votes").select("poll_id");
  const voteCount = new Map<string, number>();
  for (const v of (voteData ?? []) as { poll_id: string }[]) {
    voteCount.set(v.poll_id, (voteCount.get(v.poll_id) ?? 0) + 1);
  }

  const now = new Date();
  const queued = polls.filter(
    (p) => p.is_active && new Date(p.published_at) > now,
  );

  // 直近の配信予定が、男女で偏っていないかを見る
  const nextSix = [...queued]
    .sort((a, b) => (a.published_at < b.published_at ? -1 : 1))
    .slice(0, 6);
  const maleAhead = nextSix.filter((p) => p.gender_lean === "male").length;
  const femaleAhead = nextSix.filter((p) => p.gender_lean === "female").length;
  const lopsided = Math.abs(maleAhead - femaleAhead) >= 3;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">二択の配信</h1>
        <p className="mt-2 text-sm leading-7 text-foreground/70">
          配信待ち {queued.length} 件。
          {queued.length < 4 && (
            <span className="ml-1 font-bold text-notification">
              4件を切っています。先の分を足してください。
            </span>
          )}
        </p>
        {lopsided && (
          <p className="mt-2 rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm leading-7">
            この先6件が男性寄り {maleAhead} 件、女性寄り {femaleAhead}{" "}
            件と偏っています。交互になるよう公開日時を入れ替えてください。
            偏った週が続くと、片方の性別がまとめて離れます。
          </p>
        )}
      </header>

      {saved && (
        <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          保存しました。
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-background p-5">
        <h2 className="text-lg font-bold">
          {editing ? "二択を編集する" : "二択を追加する"}
        </h2>
        <PollForm initial={editing} />
      </section>

      <section>
        <h2 className="text-lg font-bold">一覧</h2>
        <ul className="mt-3 space-y-3">
          {polls.map((p) => {
            const isLive =
              p.is_active &&
              new Date(p.published_at) <= now &&
              (p.expires_at == null || new Date(p.expires_at) > now);
            const isFuture = p.is_active && new Date(p.published_at) > now;
            return (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={
                          "px-2 py-0.5 rounded-full font-bold " +
                          (isLive
                            ? "bg-primary/10 text-primary"
                            : isFuture
                              ? "bg-accent/20 text-accent"
                              : "bg-muted text-foreground/60")
                        }
                      >
                        {isLive ? "公開中" : isFuture ? "配信待ち" : "停止中"}
                      </span>
                      <span className="text-foreground/50">
                        {p.gender_lean === "male"
                          ? "男性寄り"
                          : p.gender_lean === "female"
                            ? "女性寄り"
                            : "男女共通"}
                      </span>
                      {p.era && <span className="text-foreground/50">{p.era}</span>}
                      <span className="text-foreground/50">
                        {voteCount.get(p.id) ?? 0} 票
                      </span>
                    </div>
                    <p className="mt-1.5 font-bold leading-7">{p.question}</p>
                    <p className="mt-0.5 text-sm text-foreground/70">
                      {p.option_a} ／ {p.option_b}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {new Date(p.published_at).toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      })}
                      公開
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/admin/polls?edit=${p.id}`}
                      className="text-sm no-underline hover:underline"
                    >
                      編集
                    </a>
                    <form action={deletePoll}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="text-sm text-foreground/50 hover:text-notification"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function PollForm({ initial }: { initial?: Poll }) {
  const action = initial ? updatePoll : createPoll;
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <form action={action} className="mt-4 space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="question" className="block text-sm font-bold mb-1">
          設問
        </label>
        <input
          id="question"
          name="question"
          required
          maxLength={120}
          defaultValue={initial?.question}
          placeholder="土曜8時、どっち派だった？"
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="option_a" className="block text-sm font-bold mb-1">
            左の選択肢
          </label>
          <input
            id="option_a"
            name="option_a"
            required
            maxLength={60}
            defaultValue={initial?.option_a}
            placeholder="8時だョ!全員集合"
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <div>
          <label htmlFor="option_b" className="block text-sm font-bold mb-1">
            右の選択肢
          </label>
          <input
            id="option_b"
            name="option_b"
            required
            maxLength={60}
            defaultValue={initial?.option_b}
            placeholder="オレたちひょうきん族"
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
      </div>

      <div>
        <label htmlFor="blurb" className="block text-sm font-bold mb-1">
          投票後の一言（当時の背景）
        </label>
        <textarea
          id="blurb"
          name="blurb"
          rows={2}
          maxLength={300}
          defaultValue={initial?.blurb}
          placeholder="ひょうきん族が始まったのは1981年、ちょうど中1の年。土曜夜のチャンネル権争いが家庭で勃発した。"
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="era" className="block text-sm font-bold mb-1">
            いつの話か
          </label>
          <select
            id="era"
            name="era"
            defaultValue={initial?.era ?? ""}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            <option value="">指定なし</option>
            {TOPIC_ERA_VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gender_lean" className="block text-sm font-bold mb-1">
            どちら寄りの話題か
          </label>
          <select
            id="gender_lean"
            name="gender_lean"
            defaultValue={initial?.gender_lean ?? "both"}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            <option value="both">男女共通</option>
            <option value="male">男性寄り</option>
            <option value="female">女性寄り</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="published_at" className="block text-sm font-bold mb-1">
            公開日時
          </label>
          <input
            id="published_at"
            name="published_at"
            type="datetime-local"
            required
            defaultValue={toLocal(initial?.published_at ?? new Date().toISOString())}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <div>
          <label htmlFor="expires_at" className="block text-sm font-bold mb-1">
            終了日時（任意）
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            defaultValue={toLocal(initial?.expires_at ?? null)}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial ? initial.is_active : true}
          className="size-5"
        />
        有効にする
      </label>

      <button
        type="submit"
        className="min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-bold"
      >
        {initial ? "更新する" : "追加する"}
      </button>
    </form>
  );
}
