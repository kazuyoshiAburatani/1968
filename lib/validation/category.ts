import { z } from "zod";

export const TIER_VALUES = ["A", "B", "C", "D", "L"] as const;
export const VIEW_LEVELS = ["guest", "member", "verified"] as const;
export const POST_LEVELS = ["member", "verified"] as const;

export const TIER_LABELS: Record<(typeof TIER_VALUES)[number], string> = {
  A: "段階A、ゲスト閲覧可",
  B: "段階B、一般会員から閲覧可",
  C: "段階C、1968 認証済のみ",
  D: "段階D、認証済かつ入会N ヶ月以上",
  L: "限定ラウンジ（創設 / 応援団）",
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export const CategoryUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "slug は 2 文字以上")
    .max(40, "slug は 40 文字以内")
    .regex(SLUG_RE, "slug は半角英小文字、数字、ハイフンのみ"),
  name: z
    .string()
    .trim()
    .min(1, "カテゴリ名を入力してください")
    .max(40, "カテゴリ名は 40 文字以内"),
  // アイコン、絵文字 1 つを想定だが肌色変化等の多コードポイント絵文字も通すため
  // 10 文字までを上限に。空文字は null として保存。
  icon: z
    .string()
    .trim()
    .max(10, "アイコンは 10 文字以内、絵文字 1 つを推奨")
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  description: z
    .string()
    .trim()
    .max(200, "説明は 200 文字以内")
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  display_order: z.coerce
    .number()
    .int()
    .min(1, "表示順は 1 以上")
    .max(99, "表示順は 99 以下"),
  tier: z.enum(TIER_VALUES, { message: "段階を選んでください" }),
  access_level_view: z.enum(VIEW_LEVELS),
  access_level_post: z.enum(POST_LEVELS),
  posting_limit_per_day: z
    .union([
      z
        .string()
        .transform((v) => v.trim())
        .pipe(
          z
            .string()
            .regex(/^\d*$/u, "投稿上限は数字で")
            .transform((v) => (v === "" ? null : Number(v))),
        ),
      z.number().int().min(1).max(99),
      z.null(),
    ])
    .nullable()
    .transform((v) => (v === null ? null : Number(v))),
  requires_tenure_months: z.coerce
    .number()
    .int()
    .min(0, "在籍月数は 0 以上")
    .max(60, "在籍月数は 60 以下")
    .default(0),
});

export type CategoryUpsertInput = z.infer<typeof CategoryUpsertSchema>;
