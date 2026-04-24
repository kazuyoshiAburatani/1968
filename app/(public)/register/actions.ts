"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// 新規登録用のマジックリンク送信。
// 実際の生年月日・プロフィール情報はリンククリック後の /onboarding で収集する。
export async function requestRegisterLink(formData: FormData) {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
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

  // Supabase のエラーはユーザーに直接見せず、
  // 送信結果の画面は常に sent=1 を返す（メール列挙攻撃対策と UX 一貫性）。
  // 例外：429 スロットルは案内を変える。
  if (error) {
    console.error("[register] signInWithOtp failed:", error.message);
    if (error.status === 429 || /security purposes|after \d+ seconds/i.test(error.message)) {
      redirect("/register?error=throttled");
    }
  }

  redirect("/register?sent=1");
}
