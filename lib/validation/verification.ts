import { z } from "zod";

export const DOCUMENT_TYPE_VALUES = [
  "mynumber",
  "health_insurance",
  "driver_license",
] as const;

export const DOCUMENT_TYPE_LABELS: Record<
  (typeof DOCUMENT_TYPE_VALUES)[number],
  string
> = {
  mynumber: "マイナンバーカード",
  health_insurance: "健康保険証",
  driver_license: "運転免許証",
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
