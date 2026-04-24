// 改行保持＋URL自動リンク化の表示コンポーネント。
// 本文はプレーンテキストで保存されているため、HTML は含まれず XSS 面で安全。
// React が文字列を出力する時点で自動エスケープされる。

const URL_REGEX = /https?:\/\/[^\s<>'"]+/g;

type Segment = { kind: "text"; value: string } | { kind: "link"; url: string };

function tokenize(text: string): Segment[] {
  const out: Segment[] = [];
  let lastIdx = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIdx) {
      out.push({ kind: "text", value: text.slice(lastIdx, start) });
    }
    // URL 末尾の句読点や閉じ括弧は除外する
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

export function RichText({ text }: { text: string }) {
  const segments = tokenize(text);
  return (
    <div className="whitespace-pre-wrap break-words leading-[1.75]">
      {segments.map((s, i) =>
        s.kind === "text" ? (
          <span key={i}>{s.value}</span>
        ) : (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="underline"
          >
            {s.url}
          </a>
        ),
      )}
    </div>
  );
}
