// 掲示板の閲覧・投稿権限を判定するピュアヘルパー。
// 2026-04-24 の方針変更で会員モデルが 2 ランク（member／regular）に簡略化された。
// guest は未ログインを表す論理値で、DB には保存しない。

export type Rank = "guest" | "member" | "regular";
export type Tier = "A" | "B" | "C" | "D";
export type ViewLevel = "guest" | "member" | "regular";
export type PostLevel = "member" | "regular";

// 閲覧可否、access_level_view と rank を突き合わせる
export function canView(rank: Rank, level: ViewLevel): boolean {
  if (level === "guest") return true;
  if (level === "member") return rank === "member" || rank === "regular";
  return rank === "regular";
}

// 投稿可否、access_level_post と rank を突き合わせる
export function canPost(rank: Rank, level: PostLevel): boolean {
  if (level === "member") return rank === "member" || rank === "regular";
  return rank === "regular";
}

export const GUEST_REPLY_LIMIT = 3;

// 旧 API との互換、guest は 3 件制限の対象外になったためいずれも false
export function shouldLimitGuestReplies(_rank: Rank): boolean {
  return false;
}

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
