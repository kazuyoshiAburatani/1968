import { describe, expect, it } from "vitest";
import {
  OnboardingSchema,
  ProfileUpdateSchema,
  isValidCalendarDate,
} from "@/lib/validation/profile";

describe("isValidCalendarDate", () => {
  it("は通常の日付を許容する", () => {
    expect(isValidCalendarDate(1968, 7, 20)).toBe(true);
    expect(isValidCalendarDate(1968, 12, 31)).toBe(true);
  });

  it("は2月29日（1968年は閏年）を許容する", () => {
    expect(isValidCalendarDate(1968, 2, 29)).toBe(true);
  });

  it("は存在しない日付を弾く", () => {
    expect(isValidCalendarDate(1968, 2, 30)).toBe(false);
    expect(isValidCalendarDate(1968, 4, 31)).toBe(false);
    expect(isValidCalendarDate(1968, 13, 1)).toBe(false);
  });
});

describe("OnboardingSchema", () => {
  const baseInput = {
    nickname: "昭和の男",
    birth_month: "7",
    birth_day: "20",
    bio_visible: "members_only",
  };

  it("は最小セットで parse できる", () => {
    const parsed = OnboardingSchema.safeParse(baseInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.nickname).toBe("昭和の男");
      expect(parsed.data.birth_month).toBe(7);
      expect(parsed.data.birth_day).toBe(20);
      expect(parsed.data.bio_visible).toBe("members_only");
    }
  });

  it("は nickname が空のとき失敗する", () => {
    const parsed = OnboardingSchema.safeParse({ ...baseInput, nickname: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain("必須");
    }
  });

  it("は nickname が30文字超のとき失敗する", () => {
    const parsed = OnboardingSchema.safeParse({
      ...baseInput,
      nickname: "あ".repeat(31),
    });
    expect(parsed.success).toBe(false);
  });

  it("は birth_month が範囲外のとき失敗する", () => {
    const parsed = OnboardingSchema.safeParse({ ...baseInput, birth_month: "13" });
    expect(parsed.success).toBe(false);
  });

  it("は空文字の任意項目を undefined に正規化する", () => {
    const parsed = OnboardingSchema.safeParse({
      ...baseInput,
      hometown: "",
      school: "",
      introduction: "",
      gender: "",
      prefecture: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.hometown).toBeUndefined();
      expect(parsed.data.school).toBeUndefined();
      expect(parsed.data.introduction).toBeUndefined();
      expect(parsed.data.gender).toBeUndefined();
      expect(parsed.data.prefecture).toBeUndefined();
    }
  });

  it("は未知の都道府県を弾く", () => {
    const parsed = OnboardingSchema.safeParse({
      ...baseInput,
      prefecture: "架空県",
    });
    expect(parsed.success).toBe(false);
  });

  it("は200文字を超える自己紹介を弾く", () => {
    const parsed = OnboardingSchema.safeParse({
      ...baseInput,
      introduction: "あ".repeat(201),
    });
    expect(parsed.success).toBe(false);
  });

  it("は bio_visible に既定値を入れる", () => {
    const parsed = OnboardingSchema.safeParse({
      nickname: "テスト",
      birth_month: "1",
      birth_day: "1",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bio_visible).toBe("members_only");
    }
  });
});

describe("ProfileUpdateSchema", () => {
  it("は空文字の任意項目を null に正規化する", () => {
    const parsed = ProfileUpdateSchema.safeParse({
      nickname: "テスト",
      hometown: "",
      school: "",
      occupation: "",
      introduction: "",
      gender: "",
      prefecture: "",
      bio_visible: "public",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // DB 更新時は null を明示的に送って既存値をクリアする想定
      expect(parsed.data.hometown).toBeNull();
      expect(parsed.data.school).toBeNull();
      expect(parsed.data.gender).toBeNull();
      expect(parsed.data.prefecture).toBeNull();
      expect(parsed.data.bio_visible).toBe("public");
    }
  });

  it("は nickname を要求する", () => {
    const parsed = ProfileUpdateSchema.safeParse({
      nickname: "",
      bio_visible: "public",
    });
    expect(parsed.success).toBe(false);
  });
});
