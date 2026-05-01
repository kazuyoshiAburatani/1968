import { z } from "zod";

// 2026-05-01 完全無料化以降の本人確認は、画像提出ではなく
// 「3 段階の心理ゲート（誓約 + 200字エッセイ + 署名）」を新規受付の標準とする。
// 旧来の身分証画像（mynumber 等）は過去レコード互換のために型としては残すが、
// UI からは self_declaration のみを案内する。

export const DOCUMENT_TYPE_VALUES = [
  "self_declaration",
  "mynumber",
  "driver_license",
  "passport",
  "health_insurance",
] as const;

export const DOCUMENT_TYPE_LABELS: Record<
  (typeof DOCUMENT_TYPE_VALUES)[number],
  string
> = {
  self_declaration: "誓約による1968認証",
  mynumber: "マイナンバーカード",
  driver_license: "運転免許証",
  passport: "パスポート",
  health_insurance: "健康保険証",
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<
  (typeof DOCUMENT_TYPE_VALUES)[number],
  string
> = {
  self_declaration:
    "1968 年生まれであることの誓約と、200 字の自由記述による1968認証フローです。画像のアップロードは不要です。",
  mynumber:
    "顔写真がある面のみご提出ください。マイナンバー（12桁）の番号は隠してください",
  driver_license: "顔写真と生年月日が見える面をご提出ください",
  passport: "顔写真があるページをご提出ください",
  health_insurance:
    "氏名・生年月日が見える面のみ。被保険者番号は隠してください",
};

export const ALLOWED_VERIFICATION_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// バケットの file_size_limit と一致させる（10 MiB）
export const MAX_VERIFICATION_FILE_SIZE = 10 * 1024 * 1024;

export const VerificationSubmitSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPE_VALUES, {
    message: "本人確認書類の種類を選んでください",
  }),
});

// 誓約フロー専用、self_declaration の入力スキーマ
export const SelfDeclarationSchema = z.object({
  birth_month: z.coerce
    .number({ message: "誕生月を選んでください" })
    .int()
    .min(1)
    .max(12),
  birth_day: z.coerce
    .number({ message: "誕生日を選んでください" })
    .int()
    .min(1)
    .max(31),
  agree_birth: z.string().refine((v) => v === "on", {
    message: "「1968年生まれです」へのチェックが必要です",
  }),
  agree_penalty: z.string().refine((v) => v === "on", {
    message: "「虚偽申告は退会処分」へのチェックが必要です",
  }),
  agree_review: z.string().refine((v) => v === "on", {
    message: "「内容は運営による目視確認の対象になる」へのチェックが必要です",
  }),
  signature: z
    .string({ message: "ご自分のニックネームをご記入ください" })
    .trim()
    .min(1, "ご自分のニックネームをご記入ください")
    .max(60, "60 文字以内で入力してください"),
  era_essay: z
    .string({ message: "「1968 年生まれの記憶」を 80 字以上でご記入ください" })
    .trim()
    .min(80, "80 字以上でご記入ください、思い出のひとつでも結構です")
    .max(800, "800 字以内でご記入ください"),
});
