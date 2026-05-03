import { z } from "zod";

export const REC_CATEGORY_VALUES = [
  "travel",
  "caregiving",
  "health",
  "finance",
  "gadget",
  "home",
  "fashion",
  "book",
  "food",
  "memorial",
  "other",
] as const;

export const REC_CATEGORY_LABELS: Record<
  (typeof REC_CATEGORY_VALUES)[number],
  string
> = {
  travel: "旅行",
  caregiving: "介護",
  health: "健康",
  finance: "お金・保険",
  gadget: "シニアスマホ・ガジェット",
  home: "暮らし・住まい",
  fashion: "ファッション",
  book: "書籍",
  food: "食",
  memorial: "終活",
  other: "その他",
};

const URL_RE = /^https?:\/\/.+/i;

export const RecommendationUpsertSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(800).default(""),
  category: z.enum(REC_CATEGORY_VALUES).default("other"),
  image_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v == null || URL_RE.test(v), {
      message: "画像 URL は http(s):// 形式で",
    }),
  affiliate_url: z
    .string()
    .trim()
    .min(1, "アフィリエイト URL は必須")
    .refine((v) => URL_RE.test(v), {
      message: "URL は http(s):// 形式で",
    }),
  affiliate_provider: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  price_yen: z
    .union([
      z
        .string()
        .transform((v) => (v.trim() === "" ? null : Number(v))),
      z.number().int().min(0),
      z.null(),
    ])
    .nullable()
    .transform((v) => (v == null ? null : Number(v))),
  display_order: z.coerce.number().int().min(1).max(999).default(100),
  is_active: z
    .union([z.literal("on"), z.literal(""), z.undefined()])
    .optional()
    .transform((v) => v === "on"),
});

export type RecommendationUpsertInput = z.infer<
  typeof RecommendationUpsertSchema
>;
