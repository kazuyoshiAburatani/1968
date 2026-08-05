import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// サイトマップ。掲示板カテゴリを撤去し、
// 検索から入ってきた人が最初に触るべき入口（二択・年表・検定・企画記事）を上位に置く。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/nenpyo`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/kentei`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/today`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/letters`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/join`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/tokushoho`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const supabase = await createSupabaseServerClient();
    const nowIso = now.toISOString();

    const [{ data: stories }, { data: topics }] = await Promise.all([
      supabase
        .from("stories")
        .select("slug, updated_at")
        .eq("is_active", true)
        .lte("published_at", nowIso),
      supabase
        .from("topics")
        .select("id, updated_at")
        .eq("is_active", true)
        .lte("published_at", nowIso)
        .order("published_at", { ascending: false })
        .limit(100),
    ]);

    const storyEntries: MetadataRoute.Sitemap = (
      (stories ?? []) as { slug: string; updated_at: string }[]
    ).map((s) => ({
      url: `${base}/stories/${s.slug}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const topicEntries: MetadataRoute.Sitemap = (
      (topics ?? []) as { id: string; updated_at: string }[]
    ).map((t) => ({
      url: `${base}/topics/${t.id}`,
      lastModified: new Date(t.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    return [...staticEntries, ...storyEntries, ...topicEntries];
  } catch {
    return staticEntries;
  }
}
