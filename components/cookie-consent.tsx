"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Cookie / 解析ツール同意バナー。
// シンプル opt-in 方式、選択結果は localStorage に 1 年保管。
// 「許可」を選ぶまでは Clarity / GA がページ外で抑止できるよう、window フラグを立てる。
//
// 50 代向け配慮、
// ・タップ領域は十分（44px 以上）
// ・文章は 16px、行間 1.7
// ・選択肢は 2 つだけ「許可する」「拒否する」
// ・初回訪問のみ表示、以降は localStorage を見て表示しない

const STORAGE_KEY = "1968-cookie-consent-v1";

type Choice = "accepted" | "declined" | null;

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Choice;
      setChoice(stored);
      // 選択結果に応じて window flag をセット、analytics スクリプト側で参照可
      if (typeof window !== "undefined") {
        (window as unknown as Record<string, boolean>).__cookieConsentDeclined =
          stored === "declined";
      }
    } catch {
      // localStorage 利用不可、表示なしで終了
    }
  }, []);

  function decide(value: "accepted" | "declined") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, boolean>).__cookieConsentDeclined =
        value === "declined";
    }
    setChoice(value);
    // 拒否した場合、解析タグが既に動いていれば opt-out
    if (value === "declined" && typeof window !== "undefined") {
      // GA: gtag opt-out
      const w = window as unknown as Record<string, unknown>;
      const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      if (gaId) {
        w[`ga-disable-${gaId}`] = true;
      }
      // Clarity: stop
      const clarity = w.clarity as
        | ((cmd: string, ...args: unknown[]) => void)
        | undefined;
      if (typeof clarity === "function") {
        try {
          clarity("stop");
        } catch {
          /* ignore */
        }
      }
    }
  }

  if (!mounted || choice !== null) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-3xl px-4 py-4 sm:py-5">
        <p
          id="cookie-consent-title"
          className="font-bold text-base text-foreground"
        >
          Cookie とアクセス解析の同意
        </p>
        <p
          id="cookie-consent-desc"
          className="mt-2 text-sm text-foreground/80 leading-7"
        >
          1968 はサイト改善のため、Microsoft Clarity と Google Analytics を
          使ってアクセス情報を匿名で記録しています。詳しくは{" "}
          <Link href="/privacy" className="underline">
            プライバシーポリシー
          </Link>
          をご確認ください。
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-5 rounded-full border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/40"
          >
            拒否する
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white text-sm font-medium active:opacity-90"
          >
            許可する
          </button>
        </div>
      </div>
    </div>
  );
}
