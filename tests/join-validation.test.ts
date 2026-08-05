import { describe, expect, it } from "vitest";
import { JoinSchema, checkBirthday } from "@/lib/validation/profile";
import { percent, choiceLabel, type PollRow } from "@/lib/polls";

// 30 秒登録の入力検証。
// 必須はニックネームと生年月日の 2 つだけで、それ以外を増やさないこと自体が施策。

describe("JoinSchema", () => {
  it("ニックネームと生年月日だけで通る", () => {
    const r = JoinSchema.safeParse({
      nickname: "博多のヤマちゃん",
      birth_year: "1968",
      birth_month: "11",
      birth_day: "3",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.birth_year).toBe(1968);
      expect(r.data.birth_month).toBe(11);
    }
  });

  it("ニックネームが空だと弾く", () => {
    const r = JoinSchema.safeParse({
      nickname: "  ",
      birth_year: "1968",
      birth_month: "5",
      birth_day: "1",
    });
    expect(r.success).toBe(false);
  });

  it("ニックネームは30文字まで", () => {
    const r = JoinSchema.safeParse({
      nickname: "あ".repeat(31),
      birth_year: "1968",
      birth_month: "5",
      birth_day: "1",
    });
    expect(r.success).toBe(false);
  });

  it("メールやパスワードは要求しない", () => {
    const r = JoinSchema.safeParse({
      nickname: "けいこ",
      birth_year: "1969",
      birth_month: "3",
      birth_day: "10",
    });
    expect(r.success).toBe(true);
  });
});

describe("checkBirthday", () => {
  it("早生まれ（1969年1〜3月）を受け入れる", () => {
    expect(checkBirthday(1969, 3, 10).ok).toBe(true);
    expect(checkBirthday(1969, 1, 1).ok).toBe(true);
    expect(checkBirthday(1969, 4, 1).ok).toBe(true);
  });

  it("1968年生まれ全体を受け入れる", () => {
    expect(checkBirthday(1968, 1, 1).ok).toBe(true);
    expect(checkBirthday(1968, 12, 31).ok).toBe(true);
  });

  it("範囲外は理由つきで断る", () => {
    const r = checkBirthday(1969, 4, 2);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("1968年");
    }
  });

  it("存在しない日付を弾く", () => {
    expect(checkBirthday(1968, 2, 30).ok).toBe(false);
  });
});

describe("percent", () => {
  it("得票率を四捨五入で返す", () => {
    expect(percent(58, 100)).toBe(58);
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
  });

  it("総数0でも落ちない", () => {
    expect(percent(0, 0)).toBe(0);
  });

  it("その他を含めても合計が100%前後に収まる", () => {
    const total = 10;
    const sum =
      percent(5, total) + percent(3, total) + percent(2, total);
    expect(sum).toBe(100);
  });
});

describe("choiceLabel", () => {
  const poll = {
    id: "x",
    question: "土曜8時、どっち派だった？",
    option_a: "8時だョ!全員集合",
    option_b: "オレたちひょうきん族",
    blurb: "",
    era: "中学",
    gender_lean: "both",
    published_at: "2026-08-01T00:00:00Z",
  } satisfies PollRow;

  it("A・Bは設問の選択肢をそのまま返す", () => {
    expect(choiceLabel(poll, "a")).toBe("8時だョ!全員集合");
    expect(choiceLabel(poll, "b")).toBe("オレたちひょうきん族");
  });

  it("どちらも選べなかった人には「その他」を返す", () => {
    expect(choiceLabel(poll, "other")).toBe("その他");
  });
});
