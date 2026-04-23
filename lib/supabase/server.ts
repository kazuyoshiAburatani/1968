import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// サーバーサイド（Server Component / Server Action / Route Handler）向けの Supabase クライアント。
// Next.js 16 の async cookies API に合わせているため、呼び出し側でも await する。
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を環境変数に設定してください",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component から呼ばれた場合は cookie の書き込み不可。
          // セッションのリフレッシュは proxy.ts（旧 middleware）側で担保する想定。
        }
      },
    },
  });
}
