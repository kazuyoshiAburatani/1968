import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  REC_CATEGORY_LABELS,
  REC_CATEGORY_VALUES,
} from "@/lib/validation/recommendation";

// 「みんなの推し」のカード一覧表示。
// ・ホーム埋め込み時は limit を指定（既定 6）
// ・専用ページでは limit=null
// ・アフィリエイトリンクは rel="nofollow noopener noreferrer" 必須
//
// recommendations テーブル未適用環境ではクラッシュせず何も表示しない。

type Rec = {
  id: string;
  title: string;
  description: string;
  category: (typeof REC_CATEGORY_VALUES)[number];
  image_url: string | null;
  affiliate_url: string;
  affiliate_provider: string | null;
  price_yen: number | null;
};

export async function PicksGrid({
  limit = 6,
  showHeading = true,
}: {
  limit?: number | null;
  showHeading?: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  let recs: Rec[] = [];
  try {
    let q = supabase
      .from("recommendations")
      .select(
        "id, title, description, category, image_url, affiliate_url, affiliate_provider, price_yen",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (limit != null) q = q.limit(limit);
    const { data } = await q;
    recs = (data ?? []) as Rec[];
  } catch {
    return null;
  }

  if (recs.length === 0) return null;

  return (
    <section>
      {showHeading && (
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <i className="ri-heart-3-fill text-rose-500" aria-hidden />
            みんなの推し
          </h2>
          <a href="/picks" className="text-sm font-medium">
            もっと見る →
          </a>
        </div>
      )}
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recs.map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-border bg-background overflow-hidden hover:shadow-sm transition-shadow"
          >
            <a
              href={r.affiliate_url}
              target="_blank"
              rel="nofollow noopener noreferrer sponsored"
              className="block no-underline"
            >
              {r.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={r.image_url}
                  alt=""
                  className="w-full aspect-[4/3] object-cover bg-muted"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full aspect-[4/3] bg-muted/40 flex items-center justify-center text-foreground/40"
                  aria-hidden
                >
                  <i className="ri-image-line text-3xl" />
                </div>
              )}
              <div className="p-4">
                <p className="text-[10px] font-bold text-foreground/70 mb-1">
                  {REC_CATEGORY_LABELS[r.category]}
                  {r.affiliate_provider && ` ・ ${r.affiliate_provider}`}
                </p>
                <h3 className="font-bold text-foreground leading-snug line-clamp-2">
                  {r.title}
                </h3>
                {r.description && (
                  <p className="mt-1 text-xs text-foreground/70 line-clamp-2 leading-6">
                    {r.description}
                  </p>
                )}
                {r.price_yen != null && (
                  <p className="mt-2 text-sm font-bold text-foreground">
                    ¥ {r.price_yen.toLocaleString()}
                  </p>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] text-foreground/50 text-center">
        ※ 商品リンクの一部はアフィリエイトプログラムを利用しており、お買い上げ時に運営に手数料が支払われることがあります。
      </p>
    </section>
  );
}
