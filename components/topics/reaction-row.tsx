"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleReaction } from "@/app/topics/actions";
import {
  REACTION_META,
  REACTION_TYPES,
  type ReactionType,
} from "@/lib/reactions";

// リアクション 6 種。
//
// 文章を書く気力が残っていない人にとって、これが唯一の参加手段になる。
// だからこそ「押した瞬間に反応が返る」ことが要件で、
// サーバの返事を待って描き替える作りにすると、その人たちの参加が丸ごと失われる。
// 押した瞬間にローカルの状態を進め、保存は裏で走らせる。失敗したときだけ戻す。
//
// 押した数はその場に出るが、誰が押したかは本人以外に見せない。

type Props = {
  targetId: string;
  counts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
  /** 未登録の人が押したときの戻り先 */
  returnPath?: string;
};

export function ReactionRow({
  targetId,
  counts,
  myReaction,
  returnPath = "/",
}: Props) {
  const router = useRouter();
  const [mine, setMine] = useState<ReactionType | null>(myReaction);
  const [, startTransition] = useTransition();

  // 自分の押下ぶんを反映した表示用の数
  function displayCount(rt: ReactionType): number {
    const base = counts[rt] ?? 0;
    const wasMine = myReaction === rt;
    const isMine = mine === rt;
    if (wasMine === isMine) return base;
    return isMine ? base + 1 : Math.max(base - 1, 0);
  }

  function press(rt: ReactionType) {
    const previous = mine;
    // 同じものを再度押したら解除、別のものなら差し替え
    setMine(previous === rt ? null : rt);

    startTransition(async () => {
      const res = await toggleReaction(targetId, rt);
      if (!res.ok) {
        setMine(previous);
        if (res.needsJoin) {
          router.push(`/join?next=${encodeURIComponent(returnPath)}`);
        }
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_TYPES.map((rt) => {
        const active = mine === rt;
        const count = displayCount(rt);
        return (
          <button
            key={rt}
            type="button"
            onClick={() => press(rt)}
            aria-label={`${REACTION_META[rt].label}${active ? "（解除）" : ""}`}
            aria-pressed={active}
            className={
              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-colors border " +
              (active
                ? "bg-primary/10 border-primary/40 text-primary font-bold"
                : "bg-background border-border text-foreground/70 hover:bg-muted active:bg-muted")
            }
          >
            <span aria-hidden className="text-base">
              {REACTION_META[rt].emoji}
            </span>
            <span className="hidden sm:inline">{REACTION_META[rt].label}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
