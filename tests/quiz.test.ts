import { describe, expect, it } from "vitest";
import {
  buildQuizSet,
  seedFromString,
  verdictFor,
  QUESTIONS_PER_SET,
  type QuizQuestion,
} from "@/lib/quiz";

// 検定の出題は「6問まで」と「男女半々」の 2 つが守られていることが要件。
// どちらも検証で離脱に直結した項目なので、退行したらテストで落ちるようにする。

function makeQuestions(): QuizQuestion[] {
  const mk = (
    i: number,
    gender_lean: QuizQuestion["gender_lean"],
  ): QuizQuestion => ({
    id: `${gender_lean}-${i}`,
    question: `問題${i}`,
    choices: ["あ", "い", "う", "え"],
    answer_index: 0,
    explanation: "解説",
    era: "小学校",
    gender_lean,
  });
  return [
    ...Array.from({ length: 20 }, (_, i) => mk(i, "male")),
    ...Array.from({ length: 20 }, (_, i) => mk(i, "female")),
  ];
}

describe("buildQuizSet", () => {
  const all = makeQuestions();

  it("必ず6問ちょうど返す", () => {
    for (const seed of [1, 2, 3, 12345, 99999]) {
      expect(buildQuizSet(all, seed)).toHaveLength(QUESTIONS_PER_SET);
    }
  });

  it("男女が3問ずつになる", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const set = buildQuizSet(all, seed);
      const male = set.filter((q) => q.gender_lean === "male").length;
      const female = set.filter((q) => q.gender_lean === "female").length;
      expect(male).toBe(3);
      expect(female).toBe(3);
    }
  });

  it("同じ問題が重複しない", () => {
    const set = buildQuizSet(all, 42);
    expect(new Set(set.map((q) => q.id)).size).toBe(set.length);
  });

  it("同じ seed なら必ず同じ並びになる（共有した URL で同じ問題が出る）", () => {
    const a = buildQuizSet(all, 777).map((q) => q.id);
    const b = buildQuizSet(all, 777).map((q) => q.id);
    expect(a).toEqual(b);
  });

  it("seed が違えば並びが変わる", () => {
    const a = buildQuizSet(all, 1).map((q) => q.id);
    const b = buildQuizSet(all, 2).map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it("先頭がいつも同じ性別に偏らない", () => {
    const leads = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
      (s) => buildQuizSet(all, s)[0].gender_lean,
    );
    expect(new Set(leads).size).toBeGreaterThan(1);
  });

  it("片方の性別の在庫が足りなくても6問揃える", () => {
    const scarce: QuizQuestion[] = [
      ...all.filter((q) => q.gender_lean === "male").slice(0, 5),
      ...all.filter((q) => q.gender_lean === "female").slice(0, 1),
    ];
    expect(buildQuizSet(scarce, 3)).toHaveLength(QUESTIONS_PER_SET);
  });
});

describe("seedFromString", () => {
  it("同じ文字列からは同じ数値になる", () => {
    expect(seedFromString("abc123")).toBe(seedFromString("abc123"));
  });

  it("違う文字列からは違う数値になる", () => {
    expect(seedFromString("abc123")).not.toBe(seedFromString("abc124"));
  });
});

describe("verdictFor", () => {
  it("満点には満点の称号が出る", () => {
    expect(verdictFor(6, 6).title).toContain("文句なし");
  });

  it("0点でも突き放さず、投稿へ渡す言い方をする", () => {
    const v = verdictFor(0, 6);
    expect(v.title).not.toContain("偽物");
    expect(v.body).toContain("書いて");
  });

  it("総数0でも落ちない", () => {
    expect(() => verdictFor(0, 1)).not.toThrow();
  });
});
