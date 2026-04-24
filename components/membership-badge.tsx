// 会員ランクを視覚的に表現するバッジ。
// rank=pending は「未課金」案内、associate/regular は落ち着いたトーンで表示。
// regular のみ「本人確認済」マークを併記する想定（フェーズ5で verifications と連動）。

type Rank = "guest" | "pending" | "associate" | "regular";

const LABELS: Record<Rank, string> = {
  guest: "ゲスト",
  pending: "未課金",
  associate: "準会員",
  regular: "正会員",
};

const VARIANTS: Record<Rank, { bg: string; fg: string; border: string }> = {
  guest: { bg: "#e8e0ce", fg: "#1f1f1f", border: "#c9bfac" },
  pending: { bg: "#e8e0ce", fg: "#8b6f3d", border: "#8b6f3d" },
  associate: { bg: "#f8f4ec", fg: "#1e3a5f", border: "#1e3a5f" },
  regular: { bg: "#1e3a5f", fg: "#f8f4ec", border: "#1e3a5f" },
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
        className="inline-flex items-center px-2 py-0.5 rounded-full border text-sm font-medium"
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
