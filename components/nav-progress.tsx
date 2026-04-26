"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ページ遷移時にトップに細い進行バーを表示する。
// 内部リンクの click を検知して即座にバーを表示し、pathname が変わったら消す。
// シニア向けに「押した→何か起きている」が即座に見えることを最優先。

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  // クリック検知でバーを出す
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      // 修飾キー、ターゲット、外部リンク、ダウンロードはスキップ
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      // 外部 URL、tel:、mailto:、#anchor はスキップ
      if (
        /^(https?:|mailto:|tel:|#)/i.test(href) &&
        !href.startsWith(window.location.origin)
      ) {
        return;
      }
      // 同一パスへの click はスキップ
      const url = new URL(href, window.location.origin);
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      setVisible(true);
    }

    // form submit でも出す
    function onSubmit(_e: SubmitEvent) {
      setVisible(true);
    }

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("submit", onSubmit, { capture: true });
    };
  }, []);

  // ルート変化を検知したらバーを消す
  useEffect(() => {
    setVisible(false);
  }, [pathname, searchParams]);

  if (!visible) return null;
  return <div className="nav-progress-bar" aria-hidden />;
}
