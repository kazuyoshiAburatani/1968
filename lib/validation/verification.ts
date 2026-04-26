import { z } from "zod";

export const DOCUMENT_TYPE_VALUES = [
  "mynumber",
  "driver_license",
  "passport",
  "health_insurance",
] as const;

export const DOCUMENT_TYPE_LABELS: Record<
  (typeof DOCUMENT_TYPE_VALUES)[number],
  string
> = {
  mynumber: "マイナンバーカード",
  driver_license: "運転免許証",
  passport: "パスポート",
  health_insurance: "健康保険証",
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<
  (typeof DOCUMENT_TYPE_VALUES)[number],
  string
> = {
  mynumber: "顔写真がある面のみご提出ください。マイナンバー（12桁）の番号は隠してください",
  driver_license: "顔写真と生年月日が見える面をご提出ください",
  passport: "顔写真があるページをご提出ください",
  health_insurance: "氏名・生年月日が見える面のみ。被保険者番号は隠してください",
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
