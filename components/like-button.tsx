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
          ? "border-[color:var(--color-accent)] bg-[color:var(--color-muted)]/40 text-[color:var(--color-accent)]"
          : "border-[color:var(--color-border)] text-[color:var(--color-foreground)]/70 hover:bg-[color:var(--color-muted)]/40")
      }
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>いいね {count}</span>
    </button>
  );
}
