import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TOPIC_AUDIENCE_LABELS,
  TOPIC_AUDIENCE_VALUES,
  TOPIC_FORMAT_LABELS,
  TOPIC_FORMAT_VALUES,
  TOPIC_ERA_VALUES,
} from "@/lib/validation/topic";
import { createTopic, deleteTopic, updateTopic } from "./actions";

export const metadata: Metadata = { title: "お題の配信" };

type Topic = {
  id: string;
  title: string;
  body: string;
  audience: (typeof TOPIC_AUDIENCE_VALUES)[number];
  format: (typeof TOPIC_FORMAT_VALUES)[number];
  blank_examples: string[];
  era: string | null;
  gender_lean: "male" | "female" | "both";
  published_at: string;
  expires_at: string | null;
  is_active: boolean;
};

type Props = {
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
};

// お題の配信管理。
//
// 運用上いちばん大事なのは「先の分まで仕込んでおく」こと。
// 公開日時を未来にして保存しておけば、その日が来たら自動で出る。
// 検証では、お題が途切れた週があるだけで習慣が切れることが分かっているので、
// 1 日 1 題ずつ出るので、常に 2 週間先までは埋まっている状態を保つ。
export default async function AdminTopicsPage({ searchParams }: Props) {
  const { saved, error, edit } = await searchParams;
  const sb = getSupabaseAdminClient();

  const { data } = await sb
    .from("topics")
    .select(
      "id, title, body, audience, format, blank_examples, era, gender_lean, published_at, expires_at, is_active",
    )
    .order("published_at", { ascending: false })
    .limit(200);

  const topics = ((data ?? []) as unknown) as Topic[];
  const editing = edit ? topics.find((t) => t.id === edit) : undefined;

  // 並べ方について。
  // 1 日 1 題で 2 か月先まで仕込んであるので、「新しい順」の一列にすると
  // 上から 10月 → 8月 と逆向きに並び、次に何が出るのか読み取れない。
  // 運営が毎日見たいのは「次に出るもの」なので、そこを先頭に近い順で置く。
  const now = new Date();
  const upcoming = topics
    .filter((t) => t.is_active && new Date(t.published_at) > now)
    .sort((a, b) => (a.published_at < b.published_at ? -1 : 1));
  const live = topics
    .filter(
      (t) =>
        t.is_active &&
        new Date(t.published_at) <= now &&
        (t.expires_at == null || new Date(t.expires_at) > now),
    )
    .sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const drafts = topics.filter((t) => !t.is_active);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">お題の配信</h1>
        <p className="mt-2 text-sm leading-7 text-foreground/70">
          公開中 {live.length} 件、これから公開 {upcoming.length} 件
          （1日1題なので、あと{upcoming.length}日分）。
          {upcoming.length < 14 && (
            <span className="ml-1 font-bold text-notification">
              2週間分を切っています。先の分を足してください。
            </span>
          )}
        </p>
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
          {editing ? "お題を編集する" : "お題を追加する"}
        </h2>
        <TopicForm initial={editing} />
      </section>

      <TopicList title="これから配信" note="上から順に出ます。1日1題、毎朝0時。" topics={upcoming} />
      <TopicList title="公開中" note="すでに出ているもの。新しい順。" topics={live} />
      <TopicList
        title="下書き・停止中"
        note="配信には乗っていません。出すときは公開日を入れて「有効にする」を押してください。"
        topics={drafts}
      />
      {topics.length === 0 && (
        <p className="rounded-xl border border-border bg-background p-6 text-center text-foreground/70">
          まだお題はありません。
        </p>
      )}
    </div>
  );
}

function TopicList({
  title,
  note,
  topics,
}: {
  title: string;
  note: string;
  topics: Topic[];
}) {
  if (topics.length === 0) return null;
  const now = new Date();
  return (
      <section>
        <h2 className="text-lg font-bold">
          {title}
          <span className="ml-2 text-sm font-normal text-foreground/60">
            {topics.length}件
          </span>
        </h2>
        <p className="mt-1 text-sm text-foreground/60">{note}</p>
        <ul className="mt-3 space-y-3">
          {topics.map((t) => {
            const isLive =
              t.is_active &&
              new Date(t.published_at) <= now &&
              (t.expires_at == null || new Date(t.expires_at) > now);
            const isFuture = t.is_active && new Date(t.published_at) > now;
            return (
              <li
                key={t.id}
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
                        {TOPIC_FORMAT_LABELS[t.format]?.split("（")[0]}
                      </span>
                      {t.era && (
                        <span className="text-foreground/50">{t.era}</span>
                      )}
                      <span className="text-foreground/50">
                        {t.gender_lean === "male"
                          ? "男性寄り"
                          : t.gender_lean === "female"
                            ? "女性寄り"
                            : "男女共通"}
                      </span>
                    </div>
                    <p className="mt-1.5 font-bold leading-7">{t.title}</p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {formatSchedule(t.published_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/admin/topics?edit=${t.id}`}
                      className="text-sm no-underline hover:underline"
                    >
                      編集
                    </a>
                    <form action={deleteTopic}>
                      <input type="hidden" name="id" value={t.id} />
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
  );
}

function TopicForm({ initial }: { initial?: Topic }) {
  const action = initial ? updateTopic : createTopic;
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
        <label htmlFor="title" className="block text-sm font-bold mb-1">
          お題
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={initial?.title}
          placeholder="初めて自分のお小遣いで買ったレコードやカセットは【　　】"
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
        <p className="mt-1 text-xs text-foreground/60">
          穴埋めのときは【　　】を必ず入れてください。何を書けばよいかが一目で分かります。
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="format" className="block text-sm font-bold mb-1">
            形式
          </label>
          <select
            id="format"
            name="format"
            defaultValue={initial?.format ?? "fill_blank"}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            {TOPIC_FORMAT_VALUES.map((v) => (
              <option key={v} value={v}>
                {TOPIC_FORMAT_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audience" className="block text-sm font-bold mb-1">
            公開先
          </label>
          <select
            id="audience"
            name="audience"
            defaultValue={initial?.audience ?? "all"}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            {TOPIC_AUDIENCE_VALUES.map((v) => (
              <option key={v} value={v}>
                {TOPIC_AUDIENCE_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="blank_examples"
          className="block text-sm font-bold mb-1"
        >
          回答例（1行に1つ、3つほど）
        </label>
        <textarea
          id="blank_examples"
          name="blank_examples"
          rows={3}
          defaultValue={(initial?.blank_examples ?? []).join("\n")}
          placeholder={"ピンク・レディー「サウスポー」\n西城秀樹「ブーメランストリート」\nツイスト「宿無し」"}
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
        <p className="mt-1 text-xs text-foreground/60">
          入力欄のプレースホルダに出ます。具体的なほど筆が動きます。
        </p>
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
          <p className="mt-1 text-xs text-foreground/60">
            男性寄りが続くと女性の投稿が止まります。交互になるよう仕込んでください。
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-bold mb-1">
          補足（任意）
        </label>
        <textarea
          id="body"
          name="body"
          rows={2}
          defaultValue={initial?.body}
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
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

// 配信日の表示。1 日 1 題なので秒まで出しても意味がない。
// 曜日を添えると「土日に何が出るか」を数えずに確かめられる。
function formatSchedule(iso: string): string {
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  if (y >= 2090) return "公開日は未定（下書き）";
  const w = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];
  const hh = jst.getUTCHours();
  const mm = jst.getUTCMinutes();
  const time = hh === 0 && mm === 0 ? "" : ` ${hh}:${String(mm).padStart(2, "0")}`;
  return `${y}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日（${w}）${time} 公開`;
}
