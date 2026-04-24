import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions の body 上限、動画アップロード（最大50MB）を許容するため 55MB に引き上げ。
  // 画像・動画の合計がこれを超えないように、アプリ側でも個別上限チェックを実施する。
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
