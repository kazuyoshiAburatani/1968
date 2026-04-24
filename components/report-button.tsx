"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/app/actions/report";

type Props = {
  targetType: "thread" | "reply";
  targetId: string;
};

export function ReportButton({ targetType, targetId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason.trim()) return;

    startTransition(async () => {
      const result = await createReport({ targetType, targetId, reason });
      if (!result.ok) {
        if (result.reason === "auth") {
          router.push("/login");
          return;
        }
        setState("error");
        return;
      }
      setState("sent");
      setReason("");
      setTimeout(() => setOpen(false), 1200);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-foreground/50 hover:text-foreground/80 underline"
      >
        通報
      </button>
    );
  }

  return (
    <div className="mt-3 rounded border border-border bg-muted/40 p-3">
      {state === "sent" ? (
        <p className="text-sm">通報を受け付けました。ご協力ありがとうございます。</p>
      ) : (
        <form onSubmit={onSubmit}>
          <p className="text-sm font-medium">通報理由</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="具体的な内容をご記入ください（500文字以内）"
            className="mt-2 w-full px-3 py-2 text-sm rounded border border-border bg-background"
            required
          />
          {state === "error" && (
            <p className="mt-2 text-sm text-red-800">送信に失敗しました。もう一度お試しください。</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={pending || !reason.trim()}
              className="min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              送信
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setState("idle");
                setReason("");
              }}
              className="min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
