"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { SelfDeclarationSchema } from "@/lib/validation/verification";

function fail(message: string): never {
  redirect(`/mypage/verification?error=${encodeURIComponent(message)}`);
}

// 完全無料化後の 1968 認証は、誓約 + 200字エッセイ + 署名のみ。
// 画像の Storage 保管・削除運用が不要になり、弁護士事項も最小化される。
// 運営は提出されたエッセイと誓約内容を目視で確認し、approve/reject を選ぶ。
export async function submitSelfDeclaration(formData: FormData) {
  const parsed = SelfDeclarationSchema.safeParse({
    birth_month: formData.get("birth_month"),
    birth_day: formData.get("birth_day"),
    agree_birth: formData.get("agree_birth") ?? "",
    agree_penalty: formData.get("agree_penalty") ?? "",
    agree_review: formData.get("agree_review") ?? "",
    signature: formData.get("signature") ?? "",
    era_essay: formData.get("era_essay") ?? "",
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { supabase, user } = await requireSession();

  // 既に pending がある場合は新規申請を弾く
  const { data: existingPending } = await supabase
    .from("verifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existingPending) {
    fail("審査中の申請があります。結果が出てから再度提出してください");
  }

  // プロフィールの誕生月日を更新（任意）
  await supabase
    .from("profiles")
    .update({
      birth_month: parsed.data.birth_month,
      birth_day: parsed.data.birth_day,
    })
    .eq("user_id", user.id);

  const { error } = await supabase.from("verifications").insert({
    user_id: user.id,
    document_type: "self_declaration",
    status: "pending",
    era_essay: parsed.data.era_essay,
    signature: parsed.data.signature,
    image_storage_path: null,
  });
  if (error) {
    console.error("[verification/declaration] insert failed:", error.message);
    fail("申請の登録に失敗しました、時間をおいてお試しください");
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/verification");
  redirect("/mypage/verification?submitted=1");
}
