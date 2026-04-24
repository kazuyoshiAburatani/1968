import { describe, expect, it } from "vitest";
import {
  canView,
  canPost,
  shouldLimitGuestReplies,
  canCreateThread,
} from "@/lib/auth/permissions";

describe("canView", () => {
  it("guest level のカテゴリは誰でも閲覧可", () => {
    for (const r of ["guest", "member", "regular"] as const) {
      expect(canView(r, "guest")).toBe(true);
    }
  });

  it("member level は member 以上のみ（guest は不可）", () => {
    expect(canView("guest", "member")).toBe(false);
    expect(canView("member", "member")).toBe(true);
    expect(canView("regular", "member")).toBe(true);
  });

  it("regular level は regular のみ", () => {
    expect(canView("guest", "regular")).toBe(false);
    expect(canView("member", "regular")).toBe(false);
    expect(canView("regular", "regular")).toBe(true);
  });
});

describe("canPost", () => {
  it("member level は member 以上のみ投稿可（guest は不可）", () => {
    expect(canPost("guest", "member")).toBe(false);
    expect(canPost("member", "member")).toBe(true);
    expect(canPost("regular", "member")).toBe(true);
  });

  it("regular level は regular のみ", () => {
    expect(canPost("member", "regular")).toBe(false);
    expect(canPost("regular", "regular")).toBe(true);
  });
});

describe("shouldLimitGuestReplies", () => {
  it("新モデルでは誰も先頭3件制限対象ではない", () => {
    expect(shouldLimitGuestReplies("guest")).toBe(false);
    expect(shouldLimitGuestReplies("member")).toBe(false);
    expect(shouldLimitGuestReplies("regular")).toBe(false);
  });
});

describe("canCreateThread", () => {
  it("投稿権限がないと拒否（guest で member カテゴリ）", () => {
    const result = canCreateThread({
      rank: "guest",
      accessLevelPost: "member",
      postingLimitPerDay: null,
      threadCountToday: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("member は member level カテゴリに投稿可", () => {
    const result = canCreateThread({
      rank: "member",
      accessLevelPost: "member",
      postingLimitPerDay: 3,
      threadCountToday: 0,
    });
    expect(result.ok).toBe(true);
  });

  it("1日上限に達したら拒否", () => {
    const result = canCreateThread({
      rank: "member",
      accessLevelPost: "member",
      postingLimitPerDay: 3,
      threadCountToday: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("1日3件");
    }
  });

  it("上限未満なら許可", () => {
    const result = canCreateThread({
      rank: "member",
      accessLevelPost: "member",
      postingLimitPerDay: 3,
      threadCountToday: 2,
    });
    expect(result.ok).toBe(true);
  });

  it("regular は regular カテゴリに投稿可（制限なし）", () => {
    const result = canCreateThread({
      rank: "regular",
      accessLevelPost: "regular",
      postingLimitPerDay: null,
      threadCountToday: 999,
    });
    expect(result.ok).toBe(true);
  });

  it("member は regular カテゴリに投稿不可", () => {
    const result = canCreateThread({
      rank: "member",
      accessLevelPost: "regular",
      postingLimitPerDay: null,
      threadCountToday: 0,
    });
    expect(result.ok).toBe(false);
  });
});
