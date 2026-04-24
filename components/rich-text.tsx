import { tokenizeRichText } from "@/lib/rich-text-parser";

// 改行保持＋URL自動リンク化の表示コンポーネント。
// 本文はプレーンテキストで保存されているため、HTML は含まれず XSS 面で安全。
// React が文字列を出力する時点で自動エスケープされる。

export function RichText({ text }: { text: string }) {
  const segments = tokenizeRichText(text);
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
