import { describe, expect, it } from "vitest";
import { tokenizeRichText } from "@/lib/rich-text-parser";

describe("tokenizeRichText", () => {
  it("URL がないテキストはそのまま1セグメント", () => {
    const result = tokenizeRichText("こんにちは、昭和43年会です。");
    expect(result).toEqual([
      { kind: "text", value: "こんにちは、昭和43年会です。" },
    ]);
  });

  it("URL を link セグメントとして抽出する", () => {
    const result = tokenizeRichText("参考は https://example.com です");
    expect(result).toEqual([
      { kind: "text", value: "参考は " },
      { kind: "link", url: "https://example.com" },
      { kind: "text", value: " です" },
    ]);
  });

  it("末尾の句読点はリンクに含めない", () => {
    const result = tokenizeRichText("https://example.com。");
    expect(result).toEqual([
      { kind: "link", url: "https://example.com" },
      { kind: "text", value: "。" },
    ]);
  });

  it("半角ピリオドも含めない", () => {
    const result = tokenizeRichText("見てください https://example.com.");
    expect(result).toEqual([
      { kind: "text", value: "見てください " },
      { kind: "link", url: "https://example.com" },
      { kind: "text", value: "." },
    ]);
  });

  it("複数URLを順に抽出する", () => {
    const result = tokenizeRichText("A https://a.com と B http://b.com 終わり");
    expect(result).toEqual([
      { kind: "text", value: "A " },
      { kind: "link", url: "https://a.com" },
      { kind: "text", value: " と B " },
      { kind: "link", url: "http://b.com" },
      { kind: "text", value: " 終わり" },
    ]);
  });

  it("閉じ括弧を含まない", () => {
    const result = tokenizeRichText("(https://example.com)");
    expect(result).toEqual([
      { kind: "text", value: "(" },
      { kind: "link", url: "https://example.com" },
      { kind: "text", value: ")" },
    ]);
  });

  it("改行付きテキストも壊さない", () => {
    const result = tokenizeRichText("1行目\n2行目 https://a.com\n3行目");
    expect(result).toEqual([
      { kind: "text", value: "1行目\n2行目 " },
      { kind: "link", url: "https://a.com" },
      { kind: "text", value: "\n3行目" },
    ]);
  });

  it("http と https を両方認識する", () => {
    const http = tokenizeRichText("http://example.com");
    const https = tokenizeRichText("https://example.com");
    expect(http).toEqual([{ kind: "link", url: "http://example.com" }]);
    expect(https).toEqual([{ kind: "link", url: "https://example.com" }]);
  });

  it("空文字は空配列", () => {
    expect(tokenizeRichText("")).toEqual([]);
  });
});
