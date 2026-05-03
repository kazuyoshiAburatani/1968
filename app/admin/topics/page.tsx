import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchAllCategories } from "@/lib/cached-categories";
import {
  TOPIC_AUDIENCE_LABELS,
  TOPIC_AUDIENCE_VALUES,
} from "@/lib/validation/topic";
import { createTopic, deleteTopic, updateTopic } from "./actions";

export const metadata: Metadata = { title: "今週のお題" };

type Topic = {
  id: string;
  title: string;
  body: string;
  audience: (typeof TOPIC_AUDIENCE_VALUES)[number];
  related_category_id: number | null;
  published_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

type Props = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminTopicsPage({ searchParams }: Props) {
  const { saved, error } = await searchParams;
  const sb = getSupabaseAdminClient();

  const [{ data: topicsData }, cats] = await Promise.all([
    sb
      .from("topics")
      .select(
        "id, title, body, audience, related_category_id, published_at, expires_at, is_active, created_at",
      )
      .order("published_at", { ascending: false })
      .limit(50),
    fetchAllCategories(),
  ]);
  const topics = (topicsData ?? []) as Topic[];

  return (
    <div>
      <h1 className="text-2xl font-bold">今週のお題</h1>
      <p className="mt-1 text-sm text-foreground/70">
        運営からの話題提供。ホーム画面で目立つ位置に表示されます。
      </p>

      {saved && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 px-4 py-2.5 text-sm">
          {saved === "created" ? "お題を作成しました。" : "お題を更新しました。"}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 text-red-900 px-4 py-2.5 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* 新規作成フォーム */}
      <details className="mt-6 rounded-xl border border-border bg-background p-4 open:shadow-sm">
        <summary className="cursor-pointer font-bold">＋ 新しいお題を作る</summary>
        <form action={createTopic} className="mt-4 space-y-4">
          <TopicFields cats={cats} />
          <div>
            <button
              type="submit"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-medium"
            >
              作成
            </button>
          </div>
        </form>
      </details>

      {/* 既存お題一覧 */}
      <ul className="mt-8 space-y-4">
        {topics.length === 0 && (
          <li className="rounded-xl border border-border bg-background p-6 text-center text-foreground/70">
            まだお題はありません。
          </li>
        )}
        {topics.map((t) => {
          const cat = cats.find((c) => c.id === t.related_category_id);
          const isLive =
            t.is_active &&
            new Date(t.published_at) <= new Date() &&
            (t.expires_at == null || new Date(t.expires_at) > new Date());
          return (
            <li
              key={t.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isLive ? (
                      <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-1.5 py-px rounded">
                        公開中
                      </span>
                    ) : t.is_active ? (
                      <span className="text-[10px] font-bold text-foreground/60 bg-muted border border-border px-1.5 py-px rounded">
                        予約 / 期限切れ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-foreground/60 bg-muted border border-border px-1.5 py-px rounded">
                        下書き
                      </span>
                    )}
                    <span className="text-[10px] text-foreground/60">
                      {TOPIC_AUDIENCE_LABELS[t.audience]}
                    </span>
                    {cat && (
                      <span className="text-[10px] text-foreground/60">
                        ・関連 {cat.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-bold">{t.title}</p>
                  {t.body && (
                    <p className="mt-1 text-sm text-foreground/75 line-clamp-2 whitespace-pre-wrap">
                      {t.body}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-foreground/60">
                    公開、{new Date(t.published_at).toLocaleString("ja-JP")}
                    {t.expires_at &&
                      ` ・ 終了、${new Date(t.expires_at).toLocaleString("ja-JP")}`}
                  </p>
                </div>
                <form action={deleteTopic}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center px-3 py-1.5 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-xs hover:bg-rose-100"
                  >
                    削除
                  </button>
                </form>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-foreground/70 underline">
                  編集
                </summary>
                <form action={updateTopic} className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={t.id} />
                  <TopicFields
                    cats={cats}
                    initial={{
                      title: t.title,
                      body: t.body,
                      audience: t.audience,
                      related_category_id: t.related_category_id,
                      published_at: toLocalInput(t.published_at),
                      expires_at: toLocalInput(t.expires_at),
                      is_active: t.is_active,
                    }}
                  />
                  <div>
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-medium"
                    >
                      保存
                    </button>
                  </div>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopicFields({
  cats,
  initial,
}: {
  cats: Awaited<ReturnType<typeof fetchAllCategories>>;
  initial?: {
    title: string;
    body: string;
    audience: (typeof TOPIC_AUDIENCE_VALUES)[number];
    related_category_id: number | null;
    published_at: string;
    expires_at: string;
    is_active: boolean;
  };
}) {
  const now = toLocalInput(new Date().toISOString());
  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="block text-xs font-bold mb-1">タイトル</label>
        <input
          type="text"
          name="title"
          required
          maxLength={100}
          defaultValue={initial?.title ?? ""}
          className="w-full px-3 py-2 rounded border border-border bg-background"
          placeholder="例、初任給、何に使いましたか？"
        />
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">本文（任意、改行 OK）</label>
        <textarea
          name="body"
          rows={3}
          maxLength={2000}
          defaultValue={initial?.body ?? ""}
          className="w-full px-3 py-2 rounded border border-border bg-background"
          placeholder="背景や、答えてほしい角度を書いておくと良い回答が集まりやすいです"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold mb-1">配信対象</label>
          <select
            name="audience"
            defaultValue={initial?.audience ?? "all"}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            {TOPIC_AUDIENCE_VALUES.map((a) => (
              <option key={a} value={a}>
                {TOPIC_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">関連カテゴリ（任意）</label>
          <select
            name="related_category_id"
            defaultValue={initial?.related_category_id?.toString() ?? ""}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            <option value="">指定なし</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold mb-1">公開日時</label>
          <input
            type="datetime-local"
            name="published_at"
            required
            defaultValue={initial?.published_at ?? now}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">終了日時（任意）</label>
          <input
            type="datetime-local"
            name="expires_at"
            defaultValue={initial?.expires_at ?? ""}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          name="is_active"
          value="on"
          defaultChecked={initial?.is_active ?? true}
        />
        <span>有効化（公開する）</span>
      </label>
    </div>
  );
}
