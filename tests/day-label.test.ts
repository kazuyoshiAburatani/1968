import { describe, expect, it } from "vitest";
import { dayLabel, feedEyebrow } from "@/lib/day-label";

// 「今日」「きのう」「おととい」。
//
// 二択とお題は 1 日 1 個ずつ、日本時間の 0 時に出る。
// サーバは UTC で動くので、素直に日付を比べると 0 時から 9 時のあいだだけ
// 「きのう」とずれる。この場は朝いちばんに開く人が多いので、
// そこがずれると毎朝おかしな表示になる。境目そのものを確かめておく。

const at = (iso: string) => new Date(iso);

describe("dayLabel", () => {
  it("同じ日なら今日", () => {
    expect(
      dayLabel("2026-08-12T00:00:00+09:00", at("2026-08-12T09:00:00+09:00")),
    ).toBe("今日");
  });

  it("日本時間の 0 時をまたいだ瞬間に、きのうへ変わる", () => {
    const published = "2026-08-12T00:00:00+09:00";
    // 12日の23時59分 → まだ今日
    expect(dayLabel(published, at("2026-08-12T23:59:00+09:00"))).toBe("今日");
    // 13日の0時1分 → きのう
    expect(dayLabel(published, at("2026-08-13T00:01:00+09:00"))).toBe("きのう");
  });

  it("日本時間の午前中に、前日扱いにならない", () => {
    // ここが UTC のまま比べると壊れるところ。
    // 8/12 8時（JST）は UTC ではまだ 8/11 23時
    expect(
      dayLabel("2026-08-12T00:00:00+09:00", at("2026-08-12T08:00:00+09:00")),
    ).toBe("今日");
  });

  it("2日前はおととい、それより前は日数で出す", () => {
    const now = at("2026-08-14T10:00:00+09:00");
    expect(dayLabel("2026-08-12T00:00:00+09:00", now)).toBe("おととい");
    expect(dayLabel("2026-08-11T00:00:00+09:00", now)).toBe("3日前");
    expect(dayLabel("2026-08-04T00:00:00+09:00", now)).toBe("10日前");
  });

  it("まだ公開前のものは null（管理画面で先の分を見たとき）", () => {
    expect(
      dayLabel("2026-08-20T00:00:00+09:00", at("2026-08-12T10:00:00+09:00")),
    ).toBeNull();
  });

  it("読めない日付でも落ちない", () => {
    expect(dayLabel("こわれた値")).toBeNull();
  });
});

describe("feedEyebrow", () => {
  const now = at("2026-08-14T10:00:00+09:00");

  it("先頭だけ「今日の二択」と名乗る", () => {
    expect(feedEyebrow("2026-08-14T00:00:00+09:00", "二択", 0, now)).toBe(
      "今日の二択",
    );
  });

  it("2つ目からは日付だけ。同じ言葉を縦に繰り返さない", () => {
    expect(feedEyebrow("2026-08-13T00:00:00+09:00", "二択", 1, now)).toBe(
      "きのう",
    );
    expect(feedEyebrow("2026-08-12T00:00:00+09:00", "二択", 2, now)).toBe(
      "おととい",
    );
  });

  it("日付が分からないときも、見出しが空にならない", () => {
    expect(feedEyebrow("こわれた値", "お題", 0, now)).toBe("お題");
    expect(feedEyebrow("こわれた値", "お題", 1, now)).toBe("お題");
  });
});
