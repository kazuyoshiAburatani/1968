import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// マジックリンクのクリック時に呼ばれる Route Handler。
// 1. URL 内の code をセッションに交換
// 2. public.profiles の有無で /onboarding または /mypage へ分岐
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const site = getSiteUrl();

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", site));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError.message);
    return NextResponse.redirect(new URL("/login?error=callback", site));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // セッション取得に失敗した、極めて例外的な状態
    return NextResponse.redirect(new URL("/login?error=no_session", site));
  }

  // プロフィール未作成なら /onboarding、作成済みなら /mypage へ
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    new URL(profile ? "/mypage" : "/onboarding", site),
  );
}
