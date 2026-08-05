import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTodayEvents } from "@/lib/timeline-events";
import { parseCivilDate } from "@/lib/school-year";

// 「今日は何の日」の帯。
//
// 検証で最も継続スコアが高かったのは LINE の毎朝配信で、
// サイトを自発的に思い出さない層（6 人中 4 人）に届く唯一の経路だった。
// その配信の中身をサイト側にも置いておき、
//   ・毎日ここに新しい一行がある状態を作る
//   ・配信を受け取る導線（LINE 友だち追加）をここから出す
// の 2 つを担わせる。
export async function TodayStrip() {
  const supabase = await createSupabaseServerClient();
  const events = await loadTodayEvents(supabase, 1);
  if (events.length === 0) return null;

  const e = events[0];
  const d = parseCivilDate(e.event_date);
  const lineUrl = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL;

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-5">
      <div className="flex items-center gap-2 text-xs font-bold text-foreground/60">
        <i className="ri-calendar-check-line text-base" aria-hidden />
        今日は何の日
      </div>

      <p className="mt-2 text-base leading-8">
        <span className="font-bold">
          {d.getUTCFullYear()}年{d.getUTCMonth() + 1}月{d.getUTCDate()}日
        </span>
        、{e.title}。
      </p>
      {e.note && (
        <p className="mt-1 text-sm leading-7 text-foreground/70">{e.note}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href="/today"
          className="text-sm font-medium no-underline hover:underline"
        >
          この日の他の出来事も見る →
        </Link>
        {lineUrl && (
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-[36px] px-4 rounded-full bg-[#06C755] text-white text-sm font-bold no-underline hover:opacity-90"
          >
            <i className="ri-line-fill text-base" aria-hidden />
            毎朝1つ、LINEで受け取る
          </a>
        )}
      </div>

      {lineUrl && (
        <p className="mt-2 text-xs leading-6 text-foreground/60">
          朝7時台に1通だけ届きます。宣伝は送りません。いつでも止められます。
        </p>
      )}
    </section>
  );
}
