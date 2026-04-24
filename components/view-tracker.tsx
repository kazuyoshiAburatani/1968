"use client";

import { useEffect } from "react";

// スレッド詳細ページの初回描画時に閲覧カウントを1増やす。
// 同じセッションの再描画やルーター再読み込みでは /api/views 側がクッキーで無視する。
export function ViewTracker({ threadId }: { threadId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/views?thread=${encodeURIComponent(threadId)}`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [threadId]);
  return null;
}
