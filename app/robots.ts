import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://1968.love";

// クローラ向け設定。
// 認証が必要な領域（mypage / admin / api）はクロール禁止、
// 公開ページ（トップ・/beta・/board・/terms 等）はクロール許可。

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/mypage/",
          "/messages/",
          "/notifications/",
          "/onboarding/",
          "/auth/",
        ],
      },
      // 主要 AI クローラ、明示的に許可してインデックスされやすくする
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
