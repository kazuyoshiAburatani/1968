// 掲示板の閲覧・投稿権限を判定するピュアヘルパー。
// categories テーブルの access_level_view / access_level_post に直接対応する。

export type Rank = "guest" | "pending" | "associate" | "regular";
export type Tier = "A" | "B" | "C" | "D";
export type ViewLevel = "guest" | "associate" | "regular";
export type PostLevel = "associate" | "regular";

// 閲覧権限、access_level_view に対する rank の適合を判定。
// guest = 誰でも、associate = 準会員以上、regular = 正会員のみ。
export function canView(rank: Rank, level: ViewLevel): boolean {
  if (level === "guest") return true;
  if (level === "associate") return rank === "associate" || rank === "regular";
  return rank === "regular";
}

// 投稿権限、access_level_post に対する rank の適合を判定。
export function canPost(rank: Rank, level: PostLevel): boolean {
  if (level === "associate") return rank === "associate" || rank === "regular";
  return rank === "regular";
}

// ゲスト／未課金 pending はスレッドごとに先頭3返信までしか閲覧できない。
export function shouldLimitGuestReplies(rank: Rank): boolean {
  return rank === "guest" || rank === "pending";
}

export const GUEST_REPLY_LIMIT = 3;

// スレッド作成可否、ランク＋1日投稿数の複合判定。
type CreateCheckInput = {
  rank: Rank;
  accessLevelPost: PostLevel;
  postingLimitPerDay: number | null;
  threadCountToday: number;
};

export type CreateCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export function canCreateThread(input: CreateCheckInput): CreateCheckResult {
  if (!canPost(input.rank, input.accessLevelPost)) {
    return { ok: false, reason: "このカテゴリへの投稿権限がありません" };
  }
  if (
    input.postingLimitPerDay != null &&
    input.threadCountToday >= input.postingLimitPerDay
  ) {
    return {
      ok: false,
      reason: `このカテゴリは1日${input.postingLimitPerDay}件までです`,
    };
  }
  return { ok: true };
}
