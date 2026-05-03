import { z } from "zod";
import { PREFECTURES } from "@/lib/prefectures";
import { BANNER_COLOR_KEYS } from "@/lib/home-banner-colors";

// オンボーディング時の入力スキーマ、生年月日は 1968 固定 + 月日選択。
export const OnboardingSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, "ニックネームは必須です")
    .max(30, "30文字以内で入力してください"),
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
    .refine(
      (v) => v == null || PREFECTURES.includes(v as (typeof PREFECTURES)[number]),
      { message: "都道府県の値が不正です" },
    ),
  hometown: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  school: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  occupation: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  introduction: z
    .string()
    .trim()
    .max(200, "自己紹介は200文字以内でお願いします")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  bio_visible: z
    .enum(["public", "members_only", "private"])
    .default("members_only"),
});

// マイページからの編集スキーマ、生年月日は変更不可。空入力は null に正規化。
export const ProfileUpdateSchema = z.object({
  nickname: z.string().trim().min(1, "ニックネームは必須です").max(30),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say", ""])
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
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
    .transform((v) => (v === "" ? null : (v ?? null))),
  school: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  occupation: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  introduction: z
    .string()
    .trim()
    .max(200, "自己紹介は200文字以内でお願いします")
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  bio_visible: z.enum(["public", "members_only", "private"]),
  home_banner_color: z
    .enum(BANNER_COLOR_KEYS as [string, ...string[]])
    .optional()
    .transform((v) => (v == null || v === "default" ? null : v)),
});

// 存在する暦日かどうかを判定する（2月31日などを弾く）。
// DB 側の生成カラムでも弾かれるが、UX 改善のためサーバ側でも検証する。
export function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}
