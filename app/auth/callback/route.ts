import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// マジックリンクのクリック時に呼ばれる Route Handler。
// 成功時はプロフィール有無で /onboarding または /mypage へ分岐。
// Supabase 側で失敗した場合（期限切れなど）はエラー理由を /login にパススルーする。
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const site = getSiteUrl();

  // Supabase から error 付きで返ってきた場合（トークン期限切れなど）
  const supabaseError = url.searchParams.get("error");
  const supabaseErrorCode = url.searchParams.get("error_code");
  if (supabaseError) {
    console.error(
      "[auth/callback] Supabase reported error:",
      supabaseError,
      supabaseErrorCode,
    );
    const reason = supabaseErrorCode ?? supabaseError;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(reason)}`, site),
    );
  }

  const code = url.searchParams.get("code");
  if (!code) {
    console.error("[auth/callback] missing code param", { search: url.search });
    return NextResponse.redirect(new URL("/login?error=missing_code", site));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error(
      "[auth/callback] exchangeCodeForSession failed:",
      exchangeError.name,
      exchangeError.message,
    );
    return NextResponse.redirect(
      new URL(`/login?error=exchange_${encodeURIComponent(exchangeError.name)}`, site),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_session", site));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    new URL(profile ? "/mypage" : "/onboarding", site),
  );
}
