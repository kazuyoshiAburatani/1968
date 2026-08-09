import type { Metadata } from "next";
import Link from "next/link";
import { FoundingCta } from "@/components/founding-cta";
import { ShareRow } from "@/components/share-row";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildPersonalTimeline,
  groupByChapter,
} from "@/lib/timeline-events";
import {
  isAcceptedBirthday,
  schoolYearOfBirth,
  schoolYearLabel,
  isCoreCohort,
} from "@/lib/school-year";

export const metadata: Metadata = {
  title: "あなたの1968年表",
  description:
    "生まれた日を入れると、あなたが何年生のときに何があったかが並びます。1968年に生まれた学年（昭和43年度生まれ）専用。早生まれの方も学年で正しく出ます。",
};

type Props = {
  searchParams: Promise<{ y?: string; m?: string; d?: string }>;
};

// 自分年表。
//
// この画面は信頼の踏み絵になっている。
// 12月生まれと3月生まれのペルソナが揃って言ったのが、
// 「学年計算が合っていれば『分かっているサイト』だと思うし、
//   間違っていたら早生まれのことなんて考えていないんだと分かって二度と来ない」。
// したがって年齢ではなく必ず学年で表示し、1〜3月生まれを別扱いしない。
export default async function NenpyoPage({ searchParams }: Props) {
  const params = await searchParams;
  const y = Number(params.y);
  const m = Number(params.m);
  const d = Number(params.d);

  const hasInput = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d);
  const valid = hasInput && isAcceptedBirthday(y, m, d);

  if (!valid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
          あなたの1968年表
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/80">
          生まれた日を入れてください。
          <br />
          あなたが何年生のときに何があったのかが、順番に並びます。
        </p>

        {hasInput && !valid && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm leading-7"
          >
            この年表は、1968年に生まれた学年のために作っています。
            1968年1月1日〜1969年4月1日の間で選んでください。
          </p>
        )}

        <form method="get" className="mt-6 space-y-5">
          <fieldset>
            <legend className="text-base font-bold mb-1.5">生まれた日</legend>
            <div className="flex items-center gap-2">
              <select
                name="y"
                defaultValue="1968"
                aria-label="生まれた年"
                className="min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 text-base"
              >
                <option value="1968">1968年</option>
                <option value="1969">1969年</option>
              </select>
              <select
                name="m"
                required
                aria-label="生まれた月"
                className="min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 text-base"
              >
                <option value="">月</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>
                    {v}月
                  </option>
                ))}
              </select>
              <select
                name="d"
                required
                aria-label="生まれた日"
                className="min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 text-base"
              >
                <option value="">日</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>
                    {v}日
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs leading-6 text-foreground/60">
              入れた日付は保存しません。年表を組み立てるためだけに使います。
            </p>
          </fieldset>

          <button
            type="submit"
            className="w-full min-h-[52px] rounded-full bg-primary text-white text-base font-bold hover:opacity-90"
          >
            年表をつくる
          </button>
        </form>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const birth = { year: y, month: m, day: d };
  const events = await buildPersonalTimeline(supabase, birth);
  const chapters = groupByChapter(events, birth);
  const sy = schoolYearOfBirth(y, m, d);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
      <header>
        <p className="text-sm text-foreground/60">
          {y}年{m}月{d}日生まれ
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-snug">
          あなたは{schoolYearLabel(sy)}
        </h1>
        <p className="mt-2 text-base leading-8 text-foreground/80">
          {isCoreCohort(sy)
            ? "1968年に生まれた学年、この集まりのど真ん中です。1975年4月に小学校へ上がり、1987年3月に高校を出た学年ですね。"
            : "1968年生まれのうち、ひとつ上の学年（昭和42年度）にあたります。1974年4月に小学校へ上がった学年です。"}
        </p>
      </header>

      {chapters.map((c) => (
        <section key={c.chapter}>
          <h2 className="text-lg font-bold border-b-2 border-primary/30 pb-1.5">
            {c.chapter}
          </h2>
          <ol className="mt-4 space-y-4">
            {c.events.map((e, i) => (
              <li
                key={`${e.date}-${i}`}
                className={
                  "relative pl-5 border-l-2 " +
                  (e.milestone ? "border-accent" : "border-border")
                }
              >
                <span
                  className={
                    "absolute -left-[5px] top-2 h-2 w-2 rounded-full " +
                    (e.milestone ? "bg-accent" : "bg-border")
                  }
                  aria-hidden
                />
                <p className="text-xs text-foreground/50">
                  {formatDate(e.date)}
                </p>
                <p className="mt-0.5 text-base font-bold leading-7">
                  {e.title}
                </p>
                <p className="mt-1 text-sm leading-7 text-foreground/70">
                  <span className="font-medium text-primary">{e.when}</span>
                  {e.note && <>。{e.note}</>}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {/* 年表を読み終えた直後がいちばん温まっている。
          ここで「人に渡す」と「席をつくる」の 2 つを並べる。
          渡す先を年表そのものにしてあるのは、受け取った人が自分の生まれた日で
          同じものを作れるから。そこがこの場の入口として一番軽い。 */}
      <ShareRow
        url={`${getSiteUrl()}/nenpyo`}
        text={`${schoolYearLabel(sy)}の年表を作りました。自分が何年生のときに何があったかが並びます。`}
        label="この年表を、同級生に送る"
      />

      <FoundingCta />

      {/* 打ち上げ花火で終わらせないための戻り口。
          「みんなが書いています」とは書かない。まだ書かれていない日に来た人には
          嘘になり、次の画面で分かる。書けることだけを書く */}
      <section className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-center">
        <p className="text-base leading-8">
          この年表の中で、いちばん覚えている出来事はどれでしたか。
          <br />
          よければ、その記憶を置いていってください。
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/#polls"
            className="inline-flex items-center justify-center min-h-[52px] px-6 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
          >
            今日の二択に答える
          </Link>
          <Link
            href="/kentei"
            className="inline-flex items-center justify-center min-h-[52px] px-6 rounded-full border-2 border-primary text-primary text-base font-bold no-underline hover:bg-primary hover:text-white transition-colors"
          >
            検定も受けてみる
          </Link>
        </div>
      </section>
    </div>
  );
}

function formatDate(iso: string): string {
  const [yy, mm, dd] = iso.split("-").map(Number);
  return `${yy}年${mm}月${dd}日`;
}
