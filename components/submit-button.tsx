"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "primary" | "outline";
};

// 送信中の連打防止と視覚フィードバックを提供する共通送信ボタン。
// 親の <form action={serverAction}> 内に置いて useFormStatus の pending を取得する。
export function SubmitButton({
  children,
  pendingText = "送信中…",
  className,
  variant = "primary",
}: Props) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex items-center justify-center gap-2 min-h-[var(--spacing-tap)] px-6 rounded-full font-medium transition-opacity disabled:cursor-wait disabled:opacity-70";
  const variantClass =
    variant === "primary"
      ? "bg-primary text-white hover:opacity-90"
      : "border border-border text-foreground/80 hover:bg-muted";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={[base, variantClass, className].filter(Boolean).join(" ")}
    >
      {pending && (
        <span
          aria-hidden
          className="size-4 border-2 border-current border-r-transparent rounded-full animate-spin"
        />
      )}
      <span>{pending ? pendingText : children}</span>
    </button>
  );
}
