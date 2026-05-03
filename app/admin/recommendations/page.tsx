import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  REC_CATEGORY_LABELS,
  REC_CATEGORY_VALUES,
} from "@/lib/validation/recommendation";
import {
  createRecommendation,
  deleteRecommendation,
  updateRecommendation,
} from "./actions";

export const metadata: Metadata = { title: "みんなの推し" };

type Rec = {
  id: string;
  title: string;
  description: string;
  category: (typeof REC_CATEGORY_VALUES)[number];
  image_url: string | null;
  affiliate_url: string;
  affiliate_provider: string | null;
  price_yen: number | null;
  display_order: number;
  is_active: boolean;
};

type Props = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminRecommendationsPage({ searchParams }: Props) {
  const { saved, error } = await searchParams;
  const sb = getSupabaseAdminClient();
  const { data: recsData } = await sb
    .from("recommendations")
    .select(
      "id, title, description, category, image_url, affiliate_url, affiliate_provider, price_yen, display_order, is_active",
    )
    .order("display_order")
    .order("created_at", { ascending: false })
    .limit(100);
  const recs = (recsData ?? []) as Rec[];

  return (
    <div>
      <h1 className="text-2xl font-bold">みんなの推し（運営おすすめ）</h1>
      <p className="mt-1 text-sm text-foreground/70">
        同年代に役立つ商品・サービスを紹介。アフィリエイト経由のお買い上げが運営費に充当されます。
      </p>

      {saved && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 px-4 py-2.5 text-sm">
          {saved === "created" ? "作成しました。" : "更新しました。"}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 text-red-900 px-4 py-2.5 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <details className="mt-6 rounded-xl border border-border bg-background p-4 open:shadow-sm">
        <summary className="cursor-pointer font-bold">＋ 新しい推しを追加</summary>
        <form action={createRecommendation} className="mt-4 space-y-3">
          <RecFields />
          <button
            type="submit"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-medium"
          >
            作成
          </button>
        </form>
      </details>

      <ul className="mt-8 space-y-4">
        {recs.length === 0 && (
          <li className="rounded-xl border border-border bg-background p-6 text-center text-foreground/70">
            まだ「推し」は登録されていません。
          </li>
        )}
        {recs.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex items-start gap-3">
              {r.image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={r.image_url}
                  alt=""
                  className="size-16 rounded object-cover bg-muted shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-foreground/70 bg-muted px-1.5 py-px rounded">
                    {REC_CATEGORY_LABELS[r.category]}
                  </span>
                  {!r.is_active && (
                    <span className="text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-300 px-1.5 py-px rounded">
                      非公開
                    </span>
                  )}
                  <span className="text-[10px] text-foreground/60">
                    順位 {r.display_order}
                  </span>
                </div>
                <p className="mt-1 font-bold">{r.title}</p>
                {r.price_yen != null && (
                  <p className="text-sm text-foreground/70">
                    ¥ {r.price_yen.toLocaleString()}
                  </p>
                )}
                <a
                  href={r.affiliate_url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-xs underline break-all"
                >
                  {r.affiliate_url}
                </a>
              </div>
              <form action={deleteRecommendation}>
                <input type="hidden" name="id" value={r.id} />
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
              <form action={updateRecommendation} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={r.id} />
                <RecFields initial={r} />
                <button
                  type="submit"
                  className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-medium"
                >
                  保存
                </button>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecFields({ initial }: { initial?: Rec }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="block text-xs font-bold mb-1">タイトル</label>
        <input
          type="text"
          name="title"
          required
          maxLength={120}
          defaultValue={initial?.title ?? ""}
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">説明（任意）</label>
        <textarea
          name="description"
          rows={3}
          maxLength={800}
          defaultValue={initial?.description ?? ""}
          className="w-full px-3 py-2 rounded border border-border bg-background"
          placeholder="同年代におすすめする理由など"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold mb-1">カテゴリ</label>
          <select
            name="category"
            defaultValue={initial?.category ?? "other"}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            {REC_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {REC_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">プロバイダ（任意、A8 / 楽天 等）</label>
          <input
            type="text"
            name="affiliate_provider"
            maxLength={60}
            defaultValue={initial?.affiliate_provider ?? ""}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">アフィリエイト URL</label>
        <input
          type="url"
          name="affiliate_url"
          required
          defaultValue={initial?.affiliate_url ?? ""}
          className="w-full px-3 py-2 rounded border border-border bg-background"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">画像 URL（任意）</label>
        <input
          type="url"
          name="image_url"
          defaultValue={initial?.image_url ?? ""}
          className="w-full px-3 py-2 rounded border border-border bg-background"
          placeholder="https://..."
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold mb-1">価格（円、任意）</label>
          <input
            type="number"
            name="price_yen"
            min={0}
            defaultValue={initial?.price_yen ?? ""}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">表示順（小さいほど上）</label>
          <input
            type="number"
            name="display_order"
            min={1}
            max={999}
            defaultValue={initial?.display_order ?? 100}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          name="is_active"
          value="on"
          defaultChecked={initial ? initial.is_active : true}
        />
        <span>公開する</span>
      </label>
    </div>
  );
}
