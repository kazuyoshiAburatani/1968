import type { MetadataRoute } from "next";
import { fetchAllCategories } from "@/lib/cached-categories";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://1968.love";

// 動的サイトマップ。固定ページに加えて、
// 12 のカテゴリ詳細ページを公開対象として含める。
// スレッド詳細はベータ運用のため、本格運用後に追加検討。

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const fixedRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE}/beta`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/board`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/timeline`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/tokushoho`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // カテゴリ詳細
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const cats = await fetchAllCategories();
    categoryRoutes = cats.map((c) => ({
      url: `${SITE}/board/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error("[sitemap] failed to fetch categories:", e);
  }

  return [...fixedRoutes, ...categoryRoutes];
}
