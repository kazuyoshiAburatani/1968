import { todayInTokyo } from "@/lib/school-year";

// 「今日」「きのう」「おととい」。
//
// 二択とお題は 1 日 1 個ずつ出て、ホームには新しい 3 つだけが並ぶ。
// そのとき、上から順に今日・きのう・おとといのものになる。
// 「今週の二択」という見出しのままだと、毎日変わることが伝わらないので、
// いつのものかを一言で添える。
//
// この 3 語を使うのは、日付そのもの（8月12日）より速く読めるため。
// 「おととい」まで日本語で言い切れる範囲なので、そこまでは言葉にして、
// それより前は日数で出す。
//
// 日付の扱いについて。
// サーバは UTC で動くので、getFullYear() などをそのまま使うと
// 日本時間の 0 時すぎが「前日」と判定される。暦日は必ず日本時間で切ること。
// 判定は todayInTokyo()（UTC 深夜の Date で暦日を表す）に合わせてある。

const DAY = 24 * 60 * 60 * 1000;

/** 日本時間での暦日に丸める。 */
function civilInTokyo(at: Date): Date {
  const jst = new Date(at.getTime() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()),
  );
}

/**
 * 公開日から「今日」「きのう」「おととい」「N日前」を返す。
 * 先の日付（まだ公開前のものを管理画面で見たときなど）は null を返す。
 */
export function dayLabel(
  publishedAt: string | Date,
  now: Date = new Date(),
): string | null {
  const at = typeof publishedAt === "string" ? new Date(publishedAt) : publishedAt;
  if (Number.isNaN(at.getTime())) return null;

  const diff = Math.round(
    (todayInTokyo(now).getTime() - civilInTokyo(at).getTime()) / DAY,
  );

  if (diff < 0) return null;
  if (diff === 0) return "今日";
  if (diff === 1) return "きのう";
  if (diff === 2) return "おととい";
  return `${diff}日前`;
}

/**
 * ホームの見出しに出す文言。
 * 先頭だけ「今日の二択」と名乗り、以降は日付だけを小さく添える。
 * 3 つとも「◯◯の二択」と繰り返すと、同じ言葉が縦に並んでうるさい。
 */
export function feedEyebrow(
  publishedAt: string | Date,
  kind: string,
  index: number,
  now: Date = new Date(),
): string {
  const label = dayLabel(publishedAt, now);
  if (index === 0) return label ? `${label}の${kind}` : kind;
  return label ?? kind;
}
