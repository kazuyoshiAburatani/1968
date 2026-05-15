import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// Google OAuth の入口。
//
// なぜ Server Action ではなく Route Handler なのか、
// Next.js 16 の Server Action 内で外部 URL に redirect() すると、
// signInWithOAuth が書き込む PKCE verifier cookie（sb-*-auth-token-code-verifier）が
// 応答ヘッダに乗らないケースがあり、結果として /auth/callback で
// exchangeCodeForSession が AuthPKCECodeVerifierMissingError で失敗する。
// Route Handler の NextResponse.redirect() なら cookie が確実にヘッダに乗るので、
// PKCE 検証が成立する。
export async function GET(_request: NextRequest) {
  const siteUrl = getSiteUrl();
  console.log("[auth/google] start, siteUrl=", siteUrl);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    console.log("[auth/google] supabase response", {
      hasUrl: !!data?.url,
      urlHost: data?.url ? new URL(data.url).host : null,
      errorName: error?.name,
      errorStatus: error?.status,
      errorMessage: error?.message,
    });

    if (error || !data?.url) {
      console.error(
        "[auth/google] signInWithOAuth failed:",
        error?.message ?? "no url returned",
      );
      return NextResponse.redirect(new URL("/login?error=google", siteUrl));
    }

    console.log("[auth/google] redirecting to provider URL");
    return NextResponse.redirect(data.url);
  } catch (e) {
    console.error("[auth/google] unexpected exception:", e);
    return NextResponse.redirect(new URL("/login?error=google", siteUrl));
  }
}
