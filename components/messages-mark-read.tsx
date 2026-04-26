"use client";

import { useEffect } from "react";
import { markConversationRead } from "@/app/messages/actions";

// チャット画面を開いた瞬間に、相手から自分宛ての未読を既読化する。
// useEffect で 1 度だけ呼び出す。連打防止のため peerId が変わった時のみ再発火。
export function MarkReadOnMount({ peerId }: { peerId: string }) {
  useEffect(() => {
    void markConversationRead(peerId);
  }, [peerId]);

  return null;
}
