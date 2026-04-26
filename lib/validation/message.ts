import { z } from "zod";

export const MessageSendSchema = z.object({
  receiver_id: z.string().uuid({ message: "送信先が不正です" }),
  body: z
    .string()
    .trim()
    .min(1, "メッセージを入力してください")
    .max(2000, "メッセージは2000文字以内で入力してください"),
});

export type MessageSendInput = z.infer<typeof MessageSendSchema>;
