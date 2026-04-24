"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// メアド宛にログイン用マジックリンクを送る。
// 既存ユーザーのみ対象（shouldCreateUser=false）。
// 存在しないメアドでも同じ「送信しました」画面に遷移させ、メール列挙攻撃を防ぐ。
export async function requestLoginLink(formData: FormData) {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  // 最低限の形式チェック、詳細は Supabase 側でも検証される
  if (!email || !email.includes("@")) {
    redirect("/login?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  // 「User not found」などはユーザーに開示せず、常に送信成功画面へ飛ばす。
  // ただしレート制限や設定不備などの技術的エラーはサーバーログに残す。
  if (error && !/not found|invalid/i.test(error.message)) {
    console.error("[login] signInWithOtp failed:", error.message);
  }

  redirect("/login?sent=1");
}
