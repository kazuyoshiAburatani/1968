import { z } from "zod";
import { PREFECTURES } from "@/lib/prefectures";
import { BANNER_COLOR_KEYS } from "@/lib/home-banner-colors";
import { isAcceptedBirthday } from "@/lib/school-year";

// 登録時の入力スキーマ。
//
// 2026-08-05 のリニューアルで、必須項目はニックネームと生年月日の 2 つだけになった。
// 「30 秒で終わること」が最優先で、都道府県も職業も自己紹介もあとから任意で足せばよい。
// 検証では、項目が増えるほど途中離脱が増え、特にパスワード欄が致命傷になっていた。
//
// 生年は 1967年4月2日〜1970年4月1日を受け入れる。
// 昭和43年度（1968年度）を中心に、ひとつ上の昭和42年度とひとつ下の昭和44年度まで。
// ここで年だけ見て弾かないこと。1967年と1970年は「年度の途中まで」しか対象にならないので、
// 年の範囲は緩く取り、日付の境目は checkBirthday（＝ isAcceptedBirthday）に任せる。
export const JoinSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, "ニックネームを入れてください")
    .max(30, "30文字以内でお願いします"),
  birth_year: z.coerce.number().int().min(1967).max(1970),
  birth_month: z.coerce.number().int().min(1).max(12),
  birth_day: z.coerce.number().int().min(1).max(31),
});

/** 生年月日が受け入れ範囲かどうかを、エラー文言つきで判定する。 */
export function checkBirthday(
  year: number,
  month: number,
  day: number,
): { ok: true } | { ok: false; message: string } {
  if (!isAcceptedBirthday(year, month, day)) {
    return {
      ok: false,
      message:
        "この集まりは、1968年に生まれた学年（昭和43年度）を中心に、そのひとつ上とひとつ下の学年までが対象です。1967年4月2日〜1970年4月1日生まれの方が入れます。",
    };
  }
  return { ok: true };
}

// マイページからの編集スキーマ。生年月日は変更不可。空入力は null に正規化。
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
  founding_directory_listed: z
    .union([z.literal("on"), z.literal(""), z.undefined()])
    .optional()
    .transform((v) => v === "on"),
});

// 旧 API との互換のため残す。実体は school-year 側の実装を使う。
export { isValidCalendarDate } from "@/lib/school-year";
