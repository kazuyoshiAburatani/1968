import { describe, expect, it } from "vitest";
import { POLL_ICONS, isValidPollIcon, pollIcon } from "@/lib/poll-icon";

// 設問の前に出す絵。
//
// いちばん大事なのは「どの問いにも必ず何かが付く」こと。
// 79 問のうち何問かが無地になると、そこだけ手抜きに見えて押されなくなる。
// 運営が何も指定しなくても、言葉から推測して必ず埋まることを確かめる。

const base = {
  question: "",
  option_a: "",
  option_b: "",
  era: null as string | null,
  icon: null as string | null,
};

const make = (over: Partial<typeof base>) => ({ ...base, ...over });

describe("pollIcon", () => {
  it("運営が選んだものがあれば、それを最優先する", () => {
    expect(
      pollIcon(make({ icon: "ri-tv-line", question: "野球の話" })),
    ).toBe("ri-tv-line");
  });

  it("一覧に無い値が入っていても、それは使わない", () => {
    // 手で DB を書き換えたときや、古い値が残っているときに壊れないこと
    const icon = pollIcon(
      make({ icon: "ri-存在しない-line", question: "1985年の日本シリーズ" }),
    );
    expect(icon).toBe("ri-trophy-line");
  });

  it("設問と選択肢の言葉から中身に合ったものを選ぶ", () => {
    expect(
      pollIcon(make({ question: "1985年の日本シリーズ、応援したのは？" })),
    ).toBe("ri-trophy-line");
    expect(pollIcon(make({ question: "土曜8時、どっち派だった？", option_a: "8時だョ!全員集合" }))).toBe(
      "ri-tv-line",
    );
    expect(pollIcon(make({ question: "中学の頃の髪型は？" }))).toBe(
      "ri-scissors-line",
    );
    expect(
      pollIcon(make({ question: "初めて触ったパソコンは？", option_b: "MSX" })),
    ).toBe("ri-computer-line");
    expect(
      pollIcon(make({ question: "小学生の頃に乗っていた自転車は？" })),
    ).toBe("ri-bike-line");
  });

  it("具体的な語のほうが、広い語より先に当たる", () => {
    // 「レコード」は「音楽」より先。並び順が崩れると、全部が音符になる
    expect(
      pollIcon(
        make({ question: "高校の頃、買っていた音楽は？", option_a: "レコード" }),
      ),
    ).toBe("ri-disc-line");
  });

  it("言葉から分からないときは、年代で逃がす", () => {
    expect(pollIcon(make({ question: "あの頃どうだった？", era: "小学校" }))).toBe(
      "ri-pencil-line",
    );
    expect(pollIcon(make({ question: "あの頃どうだった？", era: "社会人" }))).toBe(
      "ri-briefcase-line",
    );
  });

  it("年代も無いときは二択の既定にする。無地にはしない", () => {
    expect(pollIcon(make({ question: "あの頃どうだった？" }))).toBe(
      "ri-scales-3-line",
    );
  });

  it("どんな入力でも、必ず一覧にあるものを返す", () => {
    const samples = [
      make({}),
      make({ question: "！？＃", era: "存在しない年代" }),
      make({ question: "1988年10月19日、川崎球場は？" }),
      make({ question: "二十代の習い事は？", option_a: "英会話" }),
    ];
    for (const s of samples) {
      expect(isValidPollIcon(pollIcon(s))).toBe(true);
    }
  });
});

describe("isValidPollIcon", () => {
  it("一覧にあるものだけを通す", () => {
    expect(isValidPollIcon("ri-tv-line")).toBe(true);
    expect(isValidPollIcon("ri-nope")).toBe(false);
    expect(isValidPollIcon("")).toBe(false);
    expect(isValidPollIcon(null)).toBe(false);
    expect(isValidPollIcon(123)).toBe(false);
  });
});

describe("POLL_ICONS", () => {
  it("同じ値が二度出てこない", () => {
    const values = POLL_ICONS.map((i) => i.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("すべて Remix Icon の書き方になっている", () => {
    for (const i of POLL_ICONS) {
      expect(i.value).toMatch(/^ri-[a-z0-9-]+$/);
      expect(i.label.length).toBeGreaterThan(0);
    }
  });
});
