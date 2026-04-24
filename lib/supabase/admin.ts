import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// service_role キーを使った管理操作用クライアント。
// RLS をバイパスするので、Webhook など信頼できるサーバ処理からのみ呼び出す。
// ブラウザには絶対に出さない、このファイルは server-only 指定済み。
let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください",
    );
  }
  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}
