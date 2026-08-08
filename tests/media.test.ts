import { describe, expect, it } from "vitest";
import {
  MAX_IMAGES_PER_POST,
  parseMedia,
  pollImageUrl,
  postImageUrl,
} from "@/lib/media";
import { hasOptionImages, type PollRow } from "@/lib/polls";

// 写真まわり。
//
// ここで守りたいのは 2 つ。
//  1. 写真を 1 枚も入れていない状態で、これまでと同じ見た目のままであること。
//     写真は任意の飾りであって、無いと崩れるようなものにしてはいけない。
//  2. 掲示板時代に入った古い形（動画、width/height 無し）の行が混ざっていても、
//     画面が落ちないこと。

describe("parseMedia", () => {
  it("何も無い列からは空の配列を返す", () => {
    expect(parseMedia(null)).toEqual([]);
    expect(parseMedia(undefined)).toEqual([]);
    expect(parseMedia([])).toEqual([]);
    // jsonb ではない値が入っていても落ちない
    expect(parseMedia("こわれた値")).toEqual([]);
    expect(parseMedia({ path: "a.jpg" })).toEqual([]);
  });

  it("いまの形の写真をそのまま読む", () => {
    expect(
      parseMedia([{ path: "uid/abc.jpg", width: 1600, height: 1200 }]),
    ).toEqual([{ path: "uid/abc.jpg", width: 1600, height: 1200 }]);
  });

  it("掲示板時代の行（width/height 無し）も拾える", () => {
    // 大きさが分からないときは 0 を入れ、表示側で比率を決め打ちにする
    expect(
      parseMedia([
        { path: "uid/old.jpg", type: "image", mime: "image/jpeg", size: 1234 },
      ]),
    ).toEqual([{ path: "uid/old.jpg", width: 0, height: 0 }]);
  });

  it("動画は落とす。もう出す場所が無い", () => {
    expect(
      parseMedia([
        { path: "uid/movie.mp4", type: "video", mime: "video/mp4", size: 1 },
      ]),
    ).toEqual([]);
  });

  it("path の無いごみは無視する", () => {
    expect(parseMedia([{ width: 10, height: 10 }, null, 3, "x"])).toEqual([]);
  });

  it("枚数の上限を超えて返さない", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      path: `uid/${i}.jpg`,
      width: 100,
      height: 100,
    }));
    expect(parseMedia(many)).toHaveLength(MAX_IMAGES_PER_POST);
  });
});

describe("写真の URL", () => {
  it("パスが無ければ null を返す（表示側で出し分けられる）", () => {
    expect(pollImageUrl(null)).toBeNull();
    expect(pollImageUrl(undefined)).toBeNull();
    expect(postImageUrl(null)).toBeNull();
  });

  it("バケットごとに別の場所を指す", () => {
    expect(pollImageUrl("p/a.jpg")).toContain("/poll-media/p/a.jpg");
    expect(postImageUrl("u/a.jpg")).toContain("/post-media/u/a.jpg");
  });
});

describe("hasOptionImages", () => {
  const base: PollRow = {
    id: "x",
    question: "土曜8時、どっち派だった？",
    option_a: "8時だョ!全員集合",
    option_b: "オレたちひょうきん族",
    option_a_image: null,
    option_b_image: null,
    blurb: "",
    era: "中学",
    gender_lean: "both",
    published_at: "2026-08-01T00:00:00Z",
  };

  it("写真が無いお題は、これまでどおり字だけで出す", () => {
    expect(hasOptionImages(base)).toBe(false);
  });

  it("両方そろっているときだけ写真の見た目にする", () => {
    expect(
      hasOptionImages({
        ...base,
        option_a_image: "p/a.jpg",
        option_b_image: "p/b.jpg",
      }),
    ).toBe(true);
  });

  it("片方だけのときは字だけに倒す", () => {
    // DB の制約でこの状態は作れないが、万一入っても
    // 「写真のあるほうが有利」な見た目にはしない
    expect(hasOptionImages({ ...base, option_a_image: "p/a.jpg" })).toBe(false);
    expect(hasOptionImages({ ...base, option_b_image: "p/b.jpg" })).toBe(false);
  });
});
