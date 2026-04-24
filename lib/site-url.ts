// マジックリンクのリダイレクト先など、サイトの絶対 URL が必要な箇所で使うヘルパー。
// 優先順位、NEXT_PUBLIC_SITE_URL > VERCEL_URL > localhost。
// 末尾スラッシュは除去して返す。
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
