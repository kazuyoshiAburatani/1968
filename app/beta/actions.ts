"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BetaApplicationSchema } from "@/lib/validation/beta";
import {
  sendBetaApplicationAdminNotice,
  sendBetaApplicationReceipt,
} from "@/lib/email/templates";

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

  // 並行送信、応募者本人への受付メールと運営への通知
  await Promise.all([
    sendBetaApplicationReceipt({
      to: parsed.data.email,
      name: parsed.data.name,
    }),
    sendBetaApplicationAdminNotice({
      name: parsed.data.name,
      email: parsed.data.email,
      motivation: parsed.data.motivation ?? "（記入なし）",
    }),
  ]);

  revalidatePath("/beta");
  redirect("/beta?submitted=1");
}
