import { z } from "zod";
import { isAcceptedBirthday } from "@/lib/school-year";

// 生年は 1967〜1970 を受け取り、日付の境目は isAcceptedBirthday に任せる。
// 1967年と1970年は「年度の途中まで」しか対象にならないので、年だけで弾くと
// 昭和42年度・44年度の人が正しく判定されないまま落ちる。
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
  birth_year: z.coerce
    .number({ message: "生まれた年を選んでください" })
    .int()
    .min(1967, "生まれた年を選んでください")
    .max(1970, "生まれた年を選んでください"),
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
}).refine(
  (v) => isAcceptedBirthday(v.birth_year, v.birth_month, v.birth_day),
  {
    path: ["birth_day"],
    message:
      "この集まりは、1968年に生まれた学年（昭和43年度）を中心に、そのひとつ上とひとつ下の学年までが対象です。1967年4月2日〜1970年4月1日生まれの方がご応募いただけます。",
  },
);

export type BetaApplicationInput = z.infer<typeof BetaApplicationSchema>;
