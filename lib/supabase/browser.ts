import { createBrowserClient } from "@supabase/ssr";

// ブラウザ（Client Component）向けの Supabase クライアント。
// モジュールを読み込んだ時点で一度だけ生成し、以降は同じインスタンスを再利用する。
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を環境変数に設定してください",
    );
  }

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
