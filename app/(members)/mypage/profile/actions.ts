"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { PREFECTURES } from "@/lib/prefectures";

// プロフィール編集用スキーマ、生年月日は変更不可のため受け付けない。
const ProfileUpdateSchema = z.object({
  nickname: z.string().trim().min(1, "ニックネームは必須です").max(30),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say", ""])
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  prefecture: z
    .string()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v))
    .refine(
      (v) => v == null || PREFECTURES.includes(v as (typeof PREFECTURES)[number]),
      { message: "都道府県の値が不正です" },
    ),
  hometown: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  school: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  occupation: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  introduction: z
    .string()
    .trim()
    .max(200, "自己紹介は200文字以内でお願いします")
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  bio_visible: z.enum(["public", "members_only", "private"]),
});

export async function updateProfile(formData: FormData) {
  const parsed = ProfileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(`/mypage/profile?error=${encodeURIComponent(first.message)}`);
  }

  const { supabase, user } = await requireSession();

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("user_id", user.id);

  if (error) {
    console.error("[profile-edit] update failed:", error.message);
    redirect(
      `/mypage/profile?error=${encodeURIComponent("更新に失敗しました、時間をおいてお試しください")}`,
    );
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  redirect("/mypage/profile?saved=1");
}
