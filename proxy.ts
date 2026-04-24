import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 の proxy.ts（旧 middleware.ts）。
// 毎リクエスト Supabase セッションをリフレッシュし、クッキーを更新する。
// 認可判定（未ログインのリダイレクトなど）は各ルートの layout/page 側に寄せる方針。
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // 設定ミスの場合はリフレッシュせず素通しする。エラー露出は避ける。
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser を呼ぶことで有効期限が近ければアクセストークンが更新される。
  // 結果は使わないが副作用で setAll が呼ばれ、response にクッキーが反映される。
  await supabase.auth.getUser();

  return response;
}

// 静的アセットと画像最適化エンドポイントを除外してプロキシを動かす。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
