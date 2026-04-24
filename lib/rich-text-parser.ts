// プレーンテキストから URL 部分を抽出してトークン列を返すパーサ。
// React 表示層（RichText コンポーネント）と Vitest のテストが共有する。

export type Segment =
  | { kind: "text"; value: string }
  | { kind: "link"; url: string };

const URL_REGEX = /https?:\/\/[^\s<>'"]+/g;

export function tokenizeRichText(text: string): Segment[] {
  const out: Segment[] = [];
  let lastIdx = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIdx) {
      out.push({ kind: "text", value: text.slice(lastIdx, start) });
    }
    // URL 末尾の句読点や閉じ括弧はリンク対象から外す
    let url = match[0];
    let trailing = "";
    while (/[.,;:!?、。）)\]]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    out.push({ kind: "link", url });
    if (trailing) out.push({ kind: "text", value: trailing });
    lastIdx = start + match[0].length;
  }
  if (lastIdx < text.length) {
    out.push({ kind: "text", value: text.slice(lastIdx) });
  }
  return out;
}
