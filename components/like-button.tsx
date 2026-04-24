"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike } from "@/app/actions/like";

type Props = {
  targetType: "thread" | "reply";
  targetId: string;
  initialLiked: boolean;
  initialCount: number;
  // 未ログインクリック時の遷移先
  authRedirectHref?: string;
};

export function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  authRedirectHref = "/login",
}: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function onClick() {
    // Optimistic 更新
    const previousLiked = liked;
    const previousCount = count;
    setLiked(!previousLiked);
    setCount(previousLiked ? previousCount - 1 : previousCount + 1);

    startTransition(async () => {
      const result = await toggleLike({ targetType, targetId });
      if (!result.ok) {
        // 失敗ならロールバック
        setLiked(previousLiked);
        setCount(previousCount);
        if (result.reason === "auth") {
          router.push(authRedirectHref);
        }
        return;
      }
      setLiked(result.liked);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      className={
        "inline-flex items-center gap-1.5 min-h-[var(--spacing-tap)] px-3 rounded-full border text-sm transition-colors " +
        (liked
          ? "border-accent bg-muted/40 text-accent"
          : "border-border text-foreground/70 hover:bg-muted/40")
      }
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>いいね {count}</span>
    </button>
  );
}
