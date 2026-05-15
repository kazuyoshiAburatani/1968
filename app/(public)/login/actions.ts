"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// パスワードによるログイン。正しければ /mypage（未プロフィールなら /onboarding）へ、
// 失敗なら /login?error=invalid_credentials に戻す。
export async function signInWithPasswordAction(formData: FormData) {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@") || !password) {
    redirect("/login?error=invalid_credentials");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[login/password] failed:", error.message);
    if (
      error.status === 429 ||
      /security purposes|after \d+ seconds/i.test(error.message)
    ) {
      redirect("/login?error=throttled");
    }
    if (/Invalid login credentials|invalid_credentials/i.test(error.message)) {
      redirect("/login?error=invalid_credentials");
    }
    if (/Email not confirmed/i.test(error.message)) {
      redirect("/login?error=not_confirmed");
    }
    redirect("/login?error=unexpected");
  }

  // ログイン成功、onboarding を挟む判定は auth/callback と同じロジックだが、
  // ここは直接プロフィール有無を見る
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    redirect(profile ? "/mypage" : "/onboarding");
  }
  redirect("/mypage");
}

// 旧マジックリンクログイン、パスワード未設定ユーザーやパスワード忘れの保険として維持。
export async function requestLoginLink(formData: FormData) {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    redirect("/login?error=invalid_credentials");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error && !/not found|invalid/i.test(error.message)) {
    console.error("[login/magic] signInWithOtp failed:", error.message);
    if (
      error.status === 429 ||
      /security purposes|after \d+ seconds/i.test(error.message)
    ) {
      redirect("/login?error=throttled");
    }
  }

  redirect("/login?sent=1");
}

// Google OAuth ログイン。
// redirect() は内部で NEXT_REDIRECT エラーを throw する仕様なので、
// 通常の throw と区別するため try-catch では NEXT_REDIRECT を再 throw する。
export async function startGoogleOAuth() {
  const siteUrl = getSiteUrl();
  console.log("[login/google] start, siteUrl=", siteUrl);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    console.log("[login/google] supabase response", {
      hasData: !!data,
      hasUrl: !!data?.url,
      urlHost: data?.url ? new URL(data.url).host : null,
      errorName: error?.name,
      errorStatus: error?.status,
      errorMessage: error?.message,
    });

    if (error || !data?.url) {
      console.error(
        "[login/google] signInWithOAuth failed:",
        error?.message ?? "no url returned",
      );
      redirect("/login?error=google");
    }

    console.log("[login/google] redirecting to provider URL");
    redirect(data.url);
  } catch (e) {
    // redirect() は NEXT_REDIRECT を throw するため、再 throw して Next.js に処理を委ねる。
    const message = (e as Error)?.message ?? "";
    const digest = (e as { digest?: string })?.digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT") || message.includes("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("[login/google] unexpected exception:", e);
    redirect("/login?error=google");
  }
}
