import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTodayEvents } from "@/lib/timeline-events";
import { parseCivilDate, todayInTokyo } from "@/lib/school-year";

export const metadata: Metadata = {
  title: "今日は何の日",
  description:
    "1968年前後に生まれた学年から見た、今日という日の出来事。毎朝ひとつ、LINEでも受け取れます。",
};

// 「今日は何の日」。
//
// 検証で継続スコアが最も高かったのは LINE の毎朝配信で、
// サイトを自発的に思い出さない層に届く唯一の経路だった。
// このページはその配信の受け皿であり、配信本文からの着地点でもある。
export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const events = await loadTodayEvents(supabase, 8);
  const lineUrl = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL;

  const now = todayInTokyo();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
      <header>
        <p className="text-sm text-foreground/60">
          {now.getUTCFullYear()}年{now.getUTCMonth() + 1}月{now.getUTCDate()}日
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-snug">
          今日は何の日
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/80">
          1968年前後に生まれた学年から見た、今日という日の出来事です。
        </p>
      </header>

      {events.length === 0 ? (
        <p className="text-sm text-foreground/60">
          今日にあたる出来事は、まだ集まっていません。
        </p>
      ) : (
        <ol className="space-y-4">
          {events.map((e) => {
            const d = parseCivilDate(e.event_date);
            return (
              <li
                key={e.id}
                className="rounded-2xl border border-border/60 bg-background p-5"
              >
                <p className="text-sm font-bold text-primary tabular-nums">
                  {d.getUTCFullYear()}年{d.getUTCMonth() + 1}月{d.getUTCDate()}日
                  {e.genre && (
                    <span className="ml-2 font-normal text-foreground/50">
                      {e.genre}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-base font-bold leading-7">{e.title}</p>
                {e.note && (
                  <p className="mt-1.5 text-sm leading-7 text-foreground/70">
                    {e.note}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <section className="rounded-2xl border border-border/60 bg-muted/40 p-6">
        <p className="text-base leading-8">
          この日のことで、覚えていることはありますか。
          <br />
          同じ学年の人たちが、それぞれの記憶を書いています。
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[52px] px-6 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
          >
            今週のお題を見る
          </Link>
          {lineUrl && (
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-[52px] px-6 rounded-full bg-[#06C755] text-white text-base font-bold no-underline hover:opacity-90"
            >
              <i className="ri-line-fill text-lg" aria-hidden />
              毎朝1つ、LINEで受け取る
            </a>
          )}
        </div>
        {lineUrl && (
          <p className="mt-2 text-xs leading-6 text-foreground/60">
            朝7時台に1通だけ。宣伝は送りません。いつでも止められます。
          </p>
        )}
      </section>
    </div>
  );
}
