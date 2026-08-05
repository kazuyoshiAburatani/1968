// 投稿者に添える称号バッジ。
//
// 2026-08-05 のリニューアルで、身分証確認と課金を撤去したため
// 「1968認証済」「応援団」は消滅した。残すのは 2 つだけ。
//
//   運営      … 管理人からの返信であることを示す。
//                必ず返事が来る場だと分かることが、投稿を続ける最大の理由になっていた
//   創設メンバー … 立ち上げから場を温めてくれた人。種火メンバーの可視化
//
// 一般の会員にはバッジを付けない。等級が見えると気後れする人が出るため、
// 「みんな同じ学年の一人」という水平な見え方を守る。

import Image from "next/image";

export function MembershipBadge({
  isOperator,
  isFoundingMember,
  badgeSize = "sm",
}: {
  isOperator?: boolean;
  isFoundingMember?: boolean;
  /** 創設メンバーバッジ画像のサイズ。sm=20px、md=28px、lg=64px */
  badgeSize?: "sm" | "md" | "lg";
}) {
  if (!isOperator && !isFoundingMember) return null;

  const px = badgeSize === "lg" ? 64 : badgeSize === "md" ? 28 : 20;

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {isOperator && (
        <Pill bg="#e8f3f3" fg="#1f6b6b" border="#2c9a9a">
          運営
        </Pill>
      )}
      {isFoundingMember && (
        <span
          className="inline-flex items-center gap-1"
          title="立ち上げから参加している創設メンバー"
        >
          <Image
            src="/badges/founding.png"
            alt="創設メンバー"
            width={px}
            height={px}
            className="shrink-0"
          />
          {badgeSize !== "sm" && (
            <span className="text-xs font-medium text-accent">創設メンバー</span>
          )}
        </span>
      )}
    </span>
  );
}

function Pill({
  children,
  bg,
  fg,
  border,
}: {
  children: React.ReactNode;
  bg: string;
  fg: string;
  border: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold leading-none border"
      style={{ backgroundColor: bg, color: fg, borderColor: border }}
    >
      {children}
    </span>
  );
}
