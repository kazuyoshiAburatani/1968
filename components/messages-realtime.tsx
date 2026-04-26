"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
};

// 指定の peer との 1 対 1 トーク画面で、新着メッセージが入ったらサーバから再取得して反映する。
// 自分の送信は Server Action の revalidate で更新されるため、ここは相手からの新着のみ対象。
export function MessagesRealtime({
  peerId,
  currentUserId,
}: {
  peerId: string;
  currentUserId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages:${currentUserId}:${peerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${peerId}`,
        },
        (payload: RealtimePostgresInsertPayload<MessageRow>) => {
          // 受信者が自分宛てのメッセージのみ反映
          if (payload.new?.receiver_id === currentUserId) {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [peerId, currentUserId, router]);

  return null;
}
