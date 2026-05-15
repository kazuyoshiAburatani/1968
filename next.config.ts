import type { NextConfig } from "next";

const SUPABASE_HOSTNAME = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // Server Actions の body 上限、動画アップロード（最大50MB）を許容するため 55MB に引き上げ。
  // 画像・動画の合計がこれを超えないように、アプリ側でも個別上限チェックを実施する。
  //
  // allowedOrigins、www サブドメイン経由のアクセスでも Server Action が origin チェックで
  // 拒否されないようにする。canonical は apex (1968.love) で、Vercel 側で www → apex の
  // 301 リダイレクトを設定するのが本筋だが、Cloudflare 等のプロキシ事故への保険として
  // 両方を許可しておく。
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
      allowedOrigins: [
        "1968.love",
        "www.1968.love",
        // Vercel プレビュー（PR 環境）の動作確認用
        "*.vercel.app",
      ],
    },
  },

  // next/image を使う際の許可ホスト、Supabase Storage の public バケットを許可する
  // unoptimized={true} でも組み込みの src 検証は通らないため、明示的に追加する
  images: {
    remotePatterns: SUPABASE_HOSTNAME
      ? [
          {
            protocol: "https",
            hostname: SUPABASE_HOSTNAME,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
