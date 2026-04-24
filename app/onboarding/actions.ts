"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { PREFECTURES } from "@/lib/prefectures";

// 入力値のスキーマ、DB 側の制約と二重に守る。
const OnboardingSchema = z.object({
  nickname: z.string().trim().min(1, "ニックネームは必須です").max(30, "30文字以内で入力してください"),
  birth_month: z.coerce.number().int().min(1).max(12),
  birth_day: z.coerce.number().int().min(1).max(31),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say", ""])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  prefecture: z
    .string()
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : v))
    .refine((v) => v == null || PREFECTURES.includes(v as (typeof PREFECTURES)[number]), {
      message: "都道府県の値が不正です",
    }),
  hometown: z.string().trim().max(100).optional().transform((v) => (v === "" ? undefined : v)),
  school: z.string().trim().max(100).optional().transform((v) => (v === "" ? undefined : v)),
  occupation: z.string().trim().max(50).optional().transform((v) => (v === "" ? undefined : v)),
  introduction: z
    .string()
    .trim()
    .max(200, "自己紹介は200文字以内でお願いします")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  bio_visible: z.enum(["public", "members_only", "private"]).default("members_only"),
});

// 2月31日のような存在しない日付を弾く、DB 側の generated column でも弾かれるが UX 改善のため手前で止める。
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

export async function createProfile(formData: FormData) {
  const parsed = OnboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(`/onboarding?error=${encodeURIComponent(first.message)}`);
  }
  const input = parsed.data;

  if (!isValidCalendarDate(1968, input.birth_month, input.birth_day)) {
    redirect("/onboarding?error=存在しない日付です");
  }

  const { supabase, user } = await requireSession();

  const { error } = await supabase.from("profiles").insert({
    user_id: user.id,
    nickname: input.nickname,
    birth_year: 1968,
    birth_month: input.birth_month,
    birth_day: input.birth_day,
    gender: input.gender,
    prefecture: input.prefecture,
    hometown: input.hometown,
    school: input.school,
    occupation: input.occupation,
    introduction: input.introduction,
    bio_visible: input.bio_visible,
  });

  if (error) {
    console.error("[onboarding] insert profile failed:", error.message);
    redirect(`/onboarding?error=${encodeURIComponent("保存に失敗しました、時間をおいてお試しください")}`);
  }

  redirect("/mypage");
}
