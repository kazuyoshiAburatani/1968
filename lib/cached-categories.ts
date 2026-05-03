import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Tier, ViewLevel, PostLevel } from "@/lib/auth/permissions";

// categories はゲスト読み取り可能で内容もほぼ不変。
// 各ページから毎回フルテーブルを取得するとレイテンシが積み上がるため、
// プロセス内＋ Next.js のサーバキャッシュで 5 分間キャッシュする。

export type CachedCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
  tier: Tier;
  access_level_view: ViewLevel;
  access_level_post: PostLevel;
  posting_limit_per_day: number | null;
  requires_tenure_months: number;
  // ラウンジ専用フラグ、tier='L' のときのみ意味を持つ
  requires_founding: boolean;
  requires_supporter: boolean;
};

// auth コンテキスト不要のため anon キーで軽量クライアントを作る
function buildAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const fetchAllCategories = unstable_cache(
  async (): Promise<CachedCategory[]> => {
    const client = buildAnonClient();
    // requires_founding / requires_supporter はマイグレーション未適用環境で
    // 列が無く、Supabase は例外ではなく { data: null, error: {...} } を返す。
    // エラーを検知したらフォールバッククエリでベース列のみ取得する。
    const baseSelect =
      "id, slug, name, description, display_order, tier, access_level_view, access_level_post, posting_limit_per_day, requires_tenure_months";
    const extendedSelect = `${baseSelect}, requires_founding, requires_supporter`;

    let rows: Record<string, unknown>[] = [];
    const { data: extData, error: extError } = await client
      .from("categories")
      .select(extendedSelect)
      .order("display_order");

    if (extError) {
      // 拡張列が無い、または別の理由で失敗 → ベース列のみで再取得
      console.warn(
        "[cached-categories] extended select failed, falling back:",
        extError.message,
      );
      const { data: baseData, error: baseError } = await client
        .from("categories")
        .select(baseSelect)
        .order("display_order");
      if (baseError) {
        console.error(
          "[cached-categories] base select failed:",
          baseError.message,
        );
      }
      rows = baseData ?? [];
    } else {
      rows = extData ?? [];
    }

    return rows.map((r) => ({
      ...r,
      requires_founding: r.requires_founding === true,
      requires_supporter: r.requires_supporter === true,
    })) as CachedCategory[];
  },
  ["all-categories"],
  { revalidate: 300, tags: ["categories"] },
);

export async function fetchCategoryBySlug(
  slug: string,
): Promise<CachedCategory | null> {
  const all = await fetchAllCategories();
  return all.find((c) => c.slug === slug) ?? null;
}
