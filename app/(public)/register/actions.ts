"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// メール＋パスワードで新規登録。
// Supabase Auth の signUp を呼び、確認メールを送信して /auth/callback で完了する。
export async function registerWithPassword(formData: FormData) {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const password = String(formData.get("password") ?? "");
  const termsAccepted = formData.get("terms") === "on";

  if (!email || !email.includes("@")) {
    redirect("/register?error=invalid_email");
  }
  if (password.length < 8) {
    redirect("/register?error=short_password");
  }
  if (!termsAccepted) {
    redirect("/register?error=terms");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    console.error("[register] signUp failed:", error.message);
    // Supabase のレート制限は status 429 を返す
    if (
      error.status === 429 ||
      /security purposes|after \d+ seconds/i.test(error.message)
    ) {
      redirect("/register?error=throttled");
    }
    // 既に登録済み
    if (/already registered|User already/i.test(error.message)) {
      redirect("/register?error=already_registered");
    }
    redirect("/register?error=unexpected");
  }

  // 確認メールが必要な設定だと session は null のままで、メール内のリンクで /auth/callback に届く
  // 即時ログイン構成（confirm_email off）なら data.session が埋まるので直接オンボーディングへ
  if (data.session) {
    redirect("/onboarding");
  }

  redirect("/register?sent=1");
}

// 旧、マジックリンク登録の Server Action。後方互換で残し、/login/magic 等から参照する。
export async function requestRegisterLink(formData: FormData) {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const termsAccepted = formData.get("terms") === "on";

  if (!email || !email.includes("@")) {
    redirect("/register?error=invalid_email");
  }
  if (!termsAccepted) {
    redirect("/register?error=terms");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    console.error("[register/magic] signInWithOtp failed:", error.message);
    if (
      error.status === 429 ||
      /security purposes|after \d+ seconds/i.test(error.message)
    ) {
      redirect("/register?error=throttled");
    }
  }

  redirect("/register?sent=1");
}

// Google OAuth で新規登録。リダイレクト URL は Supabase が完結するため、
// signInWithOAuth が返す URL に redirect するだけでフローが進む。
export async function startGoogleOAuth() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });
  if (error || !data.url) {
    console.error("[register] google oauth failed:", error?.message);
    redirect("/register?error=google");
  }
  redirect(data.url);
}
