import { z } from "zod";

// お題の入力スキーマ。
// 身分証と課金を撤去したので、対象は「全員」と「創設メンバー限定」の 2 つだけになった。

export const TOPIC_AUDIENCE_VALUES = ["all", "founding"] as const;

export const TOPIC_AUDIENCE_LABELS: Record<
  (typeof TOPIC_AUDIENCE_VALUES)[number],
  string
> = {
  all: "全員（未登録の方にも見えます）",
  founding: "創設メンバー限定",
};

export const TOPIC_FORMAT_VALUES = ["fill_blank", "free"] as const;

export const TOPIC_FORMAT_LABELS: Record<
  (typeof TOPIC_FORMAT_VALUES)[number],
  string
> = {
  fill_blank: "穴埋め一行（【　】を含めてください）",
  free: "自由記述",
};

export const TOPIC_ERA_VALUES = [
  "小学校",
  "中学",
  "高校",
  "社会人",
] as const;

export const TopicUpsertSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "お題を入力してください")
    .max(120, "120文字以内でお願いします"),
  body: z.string().trim().max(2000, "本文は2000文字以内").default(""),
  audience: z.enum(TOPIC_AUDIENCE_VALUES).default("all"),
  format: z.enum(TOPIC_FORMAT_VALUES).default("fill_blank"),
  // 回答例は改行区切りで入力させ、配列に正規化する。
  // 具体例があるほど投稿率が上がるので、穴埋めのときは 3 つ入れる運用にする。
  blank_examples: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 6),
    ),
  era: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  gender_lean: z.enum(["male", "female", "both"]).default("both"),
  published_at: z.string().min(1, "公開日時を入力してください"),
  expires_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  is_active: z
    .union([z.literal("on"), z.literal(""), z.undefined()])
    .optional()
    .transform((v) => v === "on"),
});

export type TopicUpsertInput = z.infer<typeof TopicUpsertSchema>;

export const PollUpsertSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "設問を入力してください")
    .max(120, "120文字以内でお願いします"),
  option_a: z.string().trim().min(1, "左の選択肢を入力してください").max(60),
  option_b: z.string().trim().min(1, "右の選択肢を入力してください").max(60),
  blurb: z.string().trim().max(300).default(""),
  era: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  gender_lean: z.enum(["male", "female", "both"]).default("both"),
  published_at: z.string().min(1, "公開日時を入力してください"),
  expires_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  is_active: z
    .union([z.literal("on"), z.literal(""), z.undefined()])
    .optional()
    .transform((v) => v === "on"),
});
