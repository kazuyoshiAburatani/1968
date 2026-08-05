// 権限判定。2026-08-05 の全面リニューアルで、階層は限界まで削った。
//
// 撤去したもの、
//   ・身分証確認（verified ランク）……最も課金意欲の高い層を弾いていた
//   ・掲示板の段階 A/B/C/D 別アクセス制御……掲示板そのものを撤去
//   ・課金プラン……全機能無料
//
// 残ったのは 2 段階だけ。
//   guest  = 未登録。読む・投票する・診断する・検定を受けるところまで全部できる
//   member = 30 秒登録済み。書き込みができる
//
// 「創設メンバー」はランクではなく称号で、種火メンバーの可視化にだけ使う。

export type Rank = "guest" | "member";

export function isMember(rank: Rank): boolean {
  return rank === "member";
}

/**
 * 書き込みできるか。
 * ゲストのままでも投票・検定・年表は使えるが、文章の投稿だけは登録が要る。
 * これは制限のためではなく、投稿に名前（ニックネーム）を添えるために必要なため。
 */
export function canPost(rank: Rank): boolean {
  return rank === "member";
}

/** 限定ラウンジ（創設メンバー向けのお題）を見られるか。 */
export function canAccessFoundingRoom(input: {
  isAdmin: boolean;
  isFoundingMember: boolean;
}): boolean {
  return input.isAdmin || input.isFoundingMember;
}
