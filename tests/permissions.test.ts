import { describe, expect, it } from "vitest";
import {
  canView,
  canPost,
  shouldLimitGuestReplies,
  canCreateThread,
} from "@/lib/auth/permissions";

describe("canView", () => {
  it("guest level のカテゴリは誰でも閲覧可", () => {
    for (const r of ["guest", "pending", "associate", "regular"] as const) {
      expect(canView(r, "guest")).toBe(true);
    }
  });

  it("associate level は associate 以上のみ", () => {
    expect(canView("guest", "associate")).toBe(false);
    expect(canView("pending", "associate")).toBe(false);
    expect(canView("associate", "associate")).toBe(true);
    expect(canView("regular", "associate")).toBe(true);
  });

  it("regular level は regular のみ", () => {
    expect(canView("guest", "regular")).toBe(false);
    expect(canView("pending", "regular")).toBe(false);
    expect(canView("associate", "regular")).toBe(false);
    expect(canView("regular", "regular")).toBe(true);
  });
});

describe("canPost", () => {
  it("associate level は associate 以上のみ投稿可", () => {
    expect(canPost("guest", "associate")).toBe(false);
    expect(canPost("pending", "associate")).toBe(false);
    expect(canPost("associate", "associate")).toBe(true);
    expect(canPost("regular", "associate")).toBe(true);
  });

  it("regular level は regular のみ", () => {
    expect(canPost("associate", "regular")).toBe(false);
    expect(canPost("regular", "regular")).toBe(true);
  });
});

describe("shouldLimitGuestReplies", () => {
  it("guest と pending は返信3件制限対象", () => {
    expect(shouldLimitGuestReplies("guest")).toBe(true);
    expect(shouldLimitGuestReplies("pending")).toBe(true);
  });

  it("associate と regular は全返信閲覧可", () => {
    expect(shouldLimitGuestReplies("associate")).toBe(false);
    expect(shouldLimitGuestReplies("regular")).toBe(false);
  });
});

describe("canCreateThread", () => {
  it("投稿権限がないと拒否", () => {
    const result = canCreateThread({
      rank: "pending",
      accessLevelPost: "associate",
      postingLimitPerDay: null,
      threadCountToday: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("1日上限に達したら拒否", () => {
    const result = canCreateThread({
      rank: "associate",
      accessLevelPost: "associate",
      postingLimitPerDay: 1,
      threadCountToday: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("1日1件");
    }
  });

  it("無制限カテゴリでは投稿済み数に関わらず許可", () => {
    const result = canCreateThread({
      rank: "regular",
      accessLevelPost: "regular",
      postingLimitPerDay: null,
      threadCountToday: 999,
    });
    expect(result.ok).toBe(true);
  });

  it("上限未満なら許可", () => {
    const result = canCreateThread({
      rank: "associate",
      accessLevelPost: "associate",
      postingLimitPerDay: 1,
      threadCountToday: 0,
    });
    expect(result.ok).toBe(true);
  });
});
