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

  if (error) {
    console.error("[register] signInWithOtp failed:", error.message);
    redirect("/register?error=unexpected");
  }

  console.log("[register] signInWithOtp ok for", email);
  redirect("/register?sent=1");
}
