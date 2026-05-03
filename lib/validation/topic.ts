import { z } from "zod";

export const TOPIC_AUDIENCE_VALUES = [
  "all",
  "verified",
  "founding",
  "supporter",
] as const;

export const TOPIC_AUDIENCE_LABELS: Record<
  (typeof TOPIC_AUDIENCE_VALUES)[number],
  string
> = {
  all: "全員（ゲスト含む）",
  verified: "1968 認証済のみ",
  founding: "創設メンバー限定",
  supporter: "応援団限定",
};

export const TopicUpsertSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "お題のタイトルを入力してください")
    .max(100, "タイトルは 100 文字以内"),
  body: z.string().trim().max(2000, "本文は 2000 文字以内").default(""),
  audience: z.enum(TOPIC_AUDIENCE_VALUES).default("all"),
  related_category_id: z
    .union([
      z.string().transform((v) => (v === "" ? null : Number(v))),
      z.number().int().min(1),
      z.null(),
    ])
    .nullable()
    .transform((v) => (v == null ? null : Number(v))),
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
