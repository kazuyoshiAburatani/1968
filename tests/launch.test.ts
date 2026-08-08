import { describe, expect, it } from "vitest";
import { LAUNCH_AT, LAUNCH_LABEL, isBeforeLaunch } from "@/lib/launch";

// 公開日の判定。
//
// ここを間違えると、開店前に中身が漏れるか、開いたあとも「準備中」が
// 出続けるかのどちらかになる。どちらも取り返しがつかないので、
// 境目そのものを確かめておく。
//
// 日本時間の 0 時ちょうどが境目なので、サーバが UTC で動いていることに
// 引きずられていないかも見る（8月10日 0時 JST = 8月9日 15時 UTC）。

describe("LAUNCH_AT", () => {
  it("日本時間の 2026年8月10日 0時ちょうどを指している", () => {
    expect(LAUNCH_AT.toISOString()).toBe("2026-08-09T15:00:00.000Z");
  });

  it("画面の表記と実際の日付がずれていない", () => {
    // 表記だけ直して日付を直し忘れる、という事故を防ぐ
    const jst = new Date(LAUNCH_AT.getTime() + 9 * 60 * 60 * 1000);
    expect(LAUNCH_LABEL).toContain(`${jst.getUTCMonth() + 1}月`);
    expect(LAUNCH_LABEL).toContain(`${jst.getUTCDate()}日`);
  });
});

describe("isBeforeLaunch", () => {
  it("公開前は true", () => {
    expect(isBeforeLaunch(new Date("2026-08-08T12:00:00+09:00"))).toBe(true);
    expect(isBeforeLaunch(new Date("2026-08-09T23:59:59+09:00"))).toBe(true);
  });

  it("公開の瞬間ちょうどは、もう公開後として扱う", () => {
    // ここが true のままだと、0 時に開いた人に「準備中」が出る
    expect(isBeforeLaunch(new Date("2026-08-10T00:00:00+09:00"))).toBe(false);
  });

  it("公開後は false", () => {
    expect(isBeforeLaunch(new Date("2026-08-10T00:00:01+09:00"))).toBe(false);
    expect(isBeforeLaunch(new Date("2026-09-01T00:00:00+09:00"))).toBe(false);
  });

  it("UTC で書いた時刻でも、日本時間の境目で切り替わる", () => {
    // サーバは UTC で動く。8月10日 0時 JST は 8月9日 15時 UTC
    expect(isBeforeLaunch(new Date("2026-08-09T14:59:59Z"))).toBe(true);
    expect(isBeforeLaunch(new Date("2026-08-09T15:00:00Z"))).toBe(false);
  });
});
