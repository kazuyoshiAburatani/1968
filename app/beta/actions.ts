"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BetaApplicationSchema } from "@/lib/validation/beta";

function fail(message: string): never {
  redirect(`/beta?error=${encodeURIComponent(message)}`);
}

export async function submitBetaApplication(formData: FormData) {
  const parsed = BetaApplicationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    birth_month: formData.get("birth_month"),
    birth_day: formData.get("birth_day"),
    prefecture: formData.get("prefecture") ?? undefined,
    sns_handle: formData.get("sns_handle") ?? undefined,
    motivation: formData.get("motivation") ?? undefined,
    agree_terms: formData.get("agree_terms") ?? undefined,
  });

  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  // 簡易な honeypot、bot 投稿を弾く（人間には見えない hidden 項目に値が入っていたら拒否）
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    // 静かに成功扱いで返す（spammer に検知されないため）
    redirect("/beta?submitted=1");
  }

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;
  const userAgent = headerList.get("user-agent") ?? null;

  const admin = getSupabaseAdminClient();

  const { error } = await admin.from("beta_applications").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    birth_year: 1968,
    birth_month: parsed.data.birth_month,
    birth_day: parsed.data.birth_day,
    prefecture: parsed.data.prefecture ?? null,
    sns_handle: parsed.data.sns_handle ?? null,
    motivation: parsed.data.motivation ?? null,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    console.error("[beta/submit] insert failed:", error.message);
    fail("送信に失敗しました、時間をおいて再度お試しください");
  }

  // Resend が設定されていれば運営に通知メール送信、未設定なら console に出力のみ
  await notifyAdmin({
    name: parsed.data.name,
    email: parsed.data.email,
    motivation: parsed.data.motivation ?? "（記入なし）",
  });

  revalidatePath("/beta");
  redirect("/beta?submitted=1");
}

async function notifyAdmin(payload: {
  name: string;
  email: string;
  motivation: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BETA_NOTIFY_EMAIL ?? "support@1968.love";
  const from = process.env.BETA_NOTIFY_FROM ?? "1968 <noreply@1968.love>";

  if (!apiKey) {
    console.log(
      "[beta/notify] RESEND_API_KEY 未設定、コンソール出力のみ",
      payload,
    );
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[1968] 新しいベータテスター応募、${payload.name} さん`,
        text: [
          "ベータテスター応募が届きました。",
          "",
          `お名前、${payload.name}`,
          `メール、${payload.email}`,
          `応募動機、`,
          payload.motivation,
          "",
          "管理画面、https://supabase.com/dashboard/project/gouctopluwgejgmwvyew/editor",
        ].join("\n"),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[beta/notify] Resend API failed", res.status, body);
    }
  } catch (err) {
    console.error("[beta/notify] notify error", err);
  }
}
