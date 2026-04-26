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
    const { data } = await client
      .from("categories")
      .select(
        "id, slug, name, description, display_order, tier, access_level_view, access_level_post, posting_limit_per_day, requires_tenure_months",
      )
      .order("display_order");
    return (data ?? []) as CachedCategory[];
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
