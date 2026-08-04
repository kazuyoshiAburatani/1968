// リアクション定義、LINE スタンプ風の 6 種類。
// 1 ユーザーあたり 1 ターゲットに 1 種類まで、変更は上書き（swap）。

export type ReactionType =
  | "like"
  | "understand"
  | "nostalgic"
  | "thanks"
  | "agree"
  | "haha";

export const REACTION_TYPES: ReactionType[] = [
  "like",
  "understand",
  "nostalgic",
  "thanks",
  "agree",
  "haha",
];

// 各リアクションの表示定義。
// emoji は Remix Icon のグリフではなく本当の絵文字を使い、感情が一瞬で伝わるようにする。
// text は 50 代でも認識しやすい平仮名寄りの短い言葉。
export const REACTION_META: Record<
  ReactionType,
  { emoji: string; label: string }
> = {
  like: { emoji: "♥", label: "いいね" },
  understand: { emoji: "💚", label: "わかる" },
  nostalgic: { emoji: "🌸", label: "懐かしい" },
  thanks: { emoji: "🙏", label: "ありがとう" },
  agree: { emoji: "👍", label: "そうそう" },
  haha: { emoji: "😊", label: "笑" },
};

export function isValidReactionType(v: unknown): v is ReactionType {
  return typeof v === "string" && (REACTION_TYPES as string[]).includes(v);
}
