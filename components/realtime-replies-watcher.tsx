"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ReplyRow = {
  id: string;
  thread_id: string;
  user_id: string;
};

// 指定スレッドに新しい返信が付いたら、画面に通知を表示して再読み込みを促す。
// 直接 DOM に注入するのではなく、バナー＋更新ボタン方式で確実性を優先。
export function RealtimeRepliesWatcher({
  threadId,
  currentUserId,
}: {
  threadId: string;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`replies:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "replies",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload: RealtimePostgresInsertPayload<ReplyRow>) => {
          // 自分の投稿は Server Action 完了時の revalidate で反映されるので無視
          const authorId = payload.new.user_id;
          if (currentUserId && authorId === currentUserId) return;
          setNewCount((n) => n + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, currentUserId]);

  if (newCount === 0) return null;

  return (
    <div className="mt-6 flex items-center gap-3 rounded-full border border-[color:var(--color-primary)]/40 bg-[color:var(--color-muted)]/60 px-4 py-2 text-sm">
      <span>新しい返信が{newCount}件あります。</span>
      <button
        type="button"
        onClick={() => {
          setNewCount(0);
          router.refresh();
        }}
        className="underline font-medium text-[color:var(--color-primary)]"
      >
        再読み込み
      </button>
    </div>
  );
}
