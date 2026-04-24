// 会員ランクを視覚的に表現するバッジ。
// 2026-04-24 以降は member（無料会員）/ regular（正会員）の 2 ランクに簡略化。
// 課金色を薄めるため、バッジは目立ちすぎない色調で。

type Rank = "guest" | "member" | "regular";

const LABELS: Record<Rank, string> = {
  guest: "ゲスト",
  member: "会員",
  regular: "正会員",
};

const VARIANTS: Record<Rank, { bg: string; fg: string; border: string }> = {
  guest: { bg: "#e8e0ce", fg: "#1f1f1f", border: "#c9bfac" },
  member: { bg: "#f8f4ec", fg: "#1f1f1f", border: "#c9bfac" },
  regular: { bg: "#f8f4ec", fg: "#1e3a5f", border: "#1e3a5f" },
};

export function MembershipBadge({
  rank,
  verified,
}: {
  rank: Rank;
  verified?: boolean;
}) {
  const style = VARIANTS[rank];
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium"
        style={{
          backgroundColor: style.bg,
          color: style.fg,
          borderColor: style.border,
        }}
      >
        {LABELS[rank]}
      </span>
      {verified && rank === "regular" && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs"
          style={{
            backgroundColor: "#f8f4ec",
            color: "#8b6f3d",
            borderColor: "#8b6f3d",
          }}
        >
          本人確認済
        </span>
      )}
    </span>
  );
}
