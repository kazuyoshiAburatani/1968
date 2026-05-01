// 会員ランク + 称号バッジ。
// 2026-05-01 完全無料化以降は、ランク（member/verified）に加えて
// 「創設メンバー」「年次応援団」を独立した称号として並べて表示する。
//
// 表示優先度（左から順）：
//   ・運営AI（ランクの代わりに単独表示）
//   ・1968認証済（verified の場合）
//   ・創設メンバー（is_founding_member）
//   ・応援団（is_current_supporter）
//
// guest / member は無記名扱いとし、バッジは付けないことで「課金色のない平等感」を出す。

type Rank = "guest" | "member" | "verified";

export function MembershipBadge({
  rank,
  isFoundingMember,
  isCurrentSupporter,
  isAi,
}: {
  rank: Rank;
  isFoundingMember?: boolean;
  isCurrentSupporter?: boolean;
  isAi?: boolean;
}) {
  // 運営 AI は独立表示
  if (isAi) {
    return (
      <span className="inline-flex items-center gap-1">
        <Pill bg="#eef0e8" fg="#3d6b4a" border="#3d6b4a">
          運営AI
        </Pill>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {rank === "verified" && (
        <Pill bg="#f8f4ec" fg="#1e3a5f" border="#1e3a5f">
          1968認証済
        </Pill>
      )}
      {isFoundingMember && (
        <Pill bg="#fff7e6" fg="#8b6f3d" border="#c8a25e">
          創設メンバー
        </Pill>
      )}
      {isCurrentSupporter && (
        <Pill bg="#fdebe8" fg="#a8463b" border="#c87d72">
          応援団
        </Pill>
      )}
    </span>
  );
}

function Pill({
  bg,
  fg,
  border,
  children,
}: {
  bg: string;
  fg: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium"
      style={{ backgroundColor: bg, color: fg, borderColor: border }}
    >
      {children}
    </span>
  );
}
