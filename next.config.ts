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
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
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
