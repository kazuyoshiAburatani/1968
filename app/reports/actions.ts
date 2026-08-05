"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 違反報告。
//
// 「荒れない保証」が 50 代の投稿の前提条件であることは、
// らくらくコミュニティ（220万人、全投稿を公開前にチェック）の実績が示している。
// 事前検閲までは運用が持たないので、
//   ・どの投稿からもワンタップで報告できる
//   ・運営が管理画面ですぐ拾える
// という事後対応の速さで担保する。

const ReportSchema = z.object({
  target_id: z.string().uuid(),
  reason: z.string().trim().min(1, "理由を選んでください").max(500),
  return_path: z.string().default("/"),
});

export async function reportResponse(formData: FormData) {
  const parsed = ReportSchema.safeParse({
    target_id: formData.get("target_id"),
    reason: formData.get("reason") ?? "",
    return_path: formData.get("return_path") ?? "/",
  });

  const returnPath =
    typeof formData.get("return_path") === "string"
      ? (formData.get("return_path") as string)
      : "/";

  if (!parsed.success) {
    redirect(
      `${returnPath}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "報告できませんでした",
      )}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/join");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "topic_response",
    target_id: parsed.data.target_id,
    reason: parsed.data.reason,
  });

  if (error) {
    console.error("[reports/create]", error.message);
    redirect(
      `${parsed.data.return_path}?error=${encodeURIComponent("報告できませんでした")}`,
    );
  }

  revalidatePath(parsed.data.return_path);
  redirect(`${parsed.data.return_path}?reported=1`);
}
