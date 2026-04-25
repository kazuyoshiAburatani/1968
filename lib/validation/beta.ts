import { z } from "zod";

export const BetaApplicationSchema = z.object({
  name: z
    .string({ message: "お名前を入力してください" })
    .trim()
    .min(1, "お名前を入力してください")
    .max(60, "お名前は60文字以内で入力してください"),
  email: z
    .string({ message: "メールアドレスを入力してください" })
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  birth_month: z.coerce
    .number({ message: "誕生月を選んでください" })
    .int()
    .min(1, "誕生月を選んでください")
    .max(12, "誕生月を選んでください"),
  birth_day: z.coerce
    .number({ message: "誕生日を選んでください" })
    .int()
    .min(1, "誕生日を選んでください")
    .max(31, "誕生日を選んでください"),
  prefecture: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  sns_handle: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  motivation: z
    .string()
    .trim()
    .max(800, "応募動機は800文字以内で入力してください")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  agree_terms: z
    .union([z.string(), z.literal(undefined)])
    .refine((v) => v === "on" || v === "true" || v === "1", {
      message: "利用規約とプライバシーポリシーに同意が必要です",
    }),
});

export type BetaApplicationInput = z.infer<typeof BetaApplicationSchema>;
