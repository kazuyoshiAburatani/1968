// 掲示板の閲覧・投稿権限を判定するピュアヘルパー。
// 2026-05-01 の方針変更で、課金プランは廃止、すべての機能は無料。
// ランクは「身分証認証済か」だけで決まる：
//   guest    = 未ログイン
//   member   = メール認証済（登録だけ済んでいる）
//   verified = 1968 認証済（誓約 + 200字エッセイ + 運営承認 のいずれかを通過）
//
// 応援団（supporter）と創設メンバー（founding）はランクとは別軸の「称号」で、
// バッジ表示・ラウンジ閲覧の判定にだけ使う。投稿可否には影響しない。

export type Rank = "guest" | "member" | "verified";
export type Tier = "A" | "B" | "C" | "D";
export type ViewLevel = "guest" | "member" | "verified";
export type PostLevel = "member" | "verified";

// 閲覧可否、access_level_view と rank を突き合わせる
export function canView(rank: Rank, level: ViewLevel): boolean {
  if (level === "guest") return true;
  if (level === "member") return rank === "member" || rank === "verified";
  return rank === "verified";
}

// 投稿可否、access_level_post と rank を突き合わせる
export function canPost(rank: Rank, level: PostLevel): boolean {
  if (level === "member") return rank === "member" || rank === "verified";
  return rank === "verified";
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
    return {
      ok: false,
      reason:
        input.accessLevelPost === "verified"
          ? "このカテゴリは 1968 認証済の会員のみ投稿できます。マイページから認証手続きをお願いします。"
          : "このカテゴリへの投稿権限がありません",
    };
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
