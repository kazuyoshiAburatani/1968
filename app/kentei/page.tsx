import type { Metadata } from "next";
import Link from "next/link";
import { FoundingCta } from "@/components/founding-cta";
import { ShareRow } from "@/components/share-row";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildQuizSet,
  seedFromString,
  verdictFor,
  newSetKey,
  QUESTIONS_PER_SET,
  type QuizQuestion,
} from "@/lib/quiz";

export const metadata: Metadata = {
  title: "昭和43年度生まれ検定",
  description:
    "6問だけ。体験していないと解けない問題ばかりです。1968年に生まれた学年の記憶を、男女どちらの思い出も半分ずつ出題します。",
};

type Props = {
  searchParams: Promise<{ s?: string; a?: string }>;
};

// 検定クイズ。
//
// 制約は 2 つ、どちらも検証から来ている。
//  ・6 問まで。10 問は時間の無い層が 3 問目で離脱した
//  ・男女半々。男子文化に偏ると、女性が「私は本物じゃない側」に置かれて人に勧めなくなる
//
// 結果の言い回しにも気を配る。低い点を「偽物」と突き放すと、
// その人が持っているもう一方の記憶ごと否定してしまうため、
// 「あなたが覚えているほうを書いていってください」と投稿へ渡す。
export default async function KenteiPage({ searchParams }: Props) {
  const params = await searchParams;
  const setKey = params.s && /^[a-z0-9]{1,12}$/i.test(params.s) ? params.s : null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("quiz_questions")
    .select("id, question, choices, answer_index, explanation, era, gender_lean")
    .eq("is_active", true);

  const all = ((data ?? []) as unknown) as QuizQuestion[];

  if (all.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-base leading-8 text-foreground/70">
          いま出題できる問題がありません。少し時間をおいてお越しください。
        </p>
      </div>
    );
  }

  // セットが指定されていなければ入口を出す
  if (!setKey) {
    const fresh = newSetKey();
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
          昭和43年度生まれ検定
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/80">
          {QUESTIONS_PER_SET}問だけです。
          <br />
          調べれば分かる問題はひとつも出しません。
          あの頃を通ってきた人にしか選べない選択肢ばかりです。
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-foreground/70">
          <li className="flex gap-2">
            <i className="ri-check-line text-primary" aria-hidden />
            登録は要りません
          </li>
          <li className="flex gap-2">
            <i className="ri-check-line text-primary" aria-hidden />
            男の子の思い出と、女の子の思い出を半分ずつ出します
          </li>
          <li className="flex gap-2">
            <i className="ri-check-line text-primary" aria-hidden />
            3分ほどで終わります
          </li>
        </ul>
        <Link
          href={`/kentei?s=${fresh}`}
          className="mt-6 inline-flex w-full items-center justify-center min-h-[52px] px-8 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
        >
          はじめる
        </Link>
      </div>
    );
  }

  const questions = buildQuizSet(all, seedFromString(setKey));

  // 回答は a=0123.. の形式でクエリに載せる。サーバに保存しないので気楽に受けられる。
  const answers = (params.a ?? "")
    .split("")
    .map((c) => Number(c))
    .filter((n) => Number.isInteger(n));

  const answered = answers.length;

  // 全問回答済み → 結果
  if (answered >= questions.length) {
    const score = questions.reduce(
      (n, q, i) => n + (answers[i] === q.answer_index ? 1 : 0),
      0,
    );
    const verdict = verdictFor(score, questions.length);

    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 text-center">
          <p className="text-sm font-bold text-primary">結果</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {score}
            <span className="text-xl text-foreground/60"> / {questions.length}</span>
          </p>
          <h1 className="mt-3 text-xl sm:text-2xl font-bold leading-snug">
            {verdict.title}
          </h1>
          <p className="mt-2 text-base leading-8 text-foreground/80">
            {verdict.body}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">答え合わせ</h2>
          {questions.map((q, i) => {
            const mine = answers[i];
            const correct = mine === q.answer_index;
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-border/60 bg-background p-4"
              >
                <p className="text-sm text-foreground/50">第{i + 1}問</p>
                <p className="mt-1 text-base font-bold leading-7">{q.question}</p>
                <p className="mt-2 text-sm leading-7">
                  <span
                    className={
                      "inline-block px-2 py-0.5 rounded-full text-xs font-bold mr-2 " +
                      (correct
                        ? "bg-primary/10 text-primary"
                        : "bg-notification/10 text-notification")
                    }
                  >
                    {correct ? "正解" : "残念"}
                  </span>
                  正しくは「{q.choices[q.answer_index]}」
                </p>
                <p className="mt-2 text-sm leading-7 text-foreground/70">
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </section>

        <ShareRow
          url={`${getSiteUrl()}/kentei`}
          text={`昭和43年度生まれ検定、${questions.length}問中${score}問でした。${verdict.title}`}
          label="この結果を、同級生に送る"
        />

        <FoundingCta />

        <section className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-center">
          <p className="text-base leading-8">
            解けなかった問題のほうを、あなたはきっと別の形で覚えています。
            <br />
            その記憶を、置いていってもらえませんか。
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/#polls"
              className="inline-flex items-center justify-center min-h-[52px] px-6 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
            >
              今日の二択に答える
            </Link>
            <Link
              href="/nenpyo"
              className="inline-flex items-center justify-center min-h-[52px] px-6 rounded-full border-2 border-primary text-primary text-base font-bold no-underline hover:bg-primary hover:text-white transition-colors"
            >
              自分の年表もつくる
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // 出題中
  const q = questions[answered];
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between text-sm text-foreground/60">
        <span>
          第{answered + 1}問 / {questions.length}問
        </span>
        <span>{q.era ?? ""}</span>
      </div>
      <div
        className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden"
        role="img"
        aria-label={`${questions.length}問中${answered}問終了`}
      >
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${(answered / questions.length) * 100}%` }}
        />
      </div>

      <h1 className="mt-6 text-xl sm:text-2xl font-bold leading-relaxed">
        {q.question}
      </h1>

      <div className="mt-5 space-y-2.5">
        {q.choices.map((c, ci) => (
          <Link
            key={ci}
            href={`/kentei?s=${setKey}&a=${params.a ?? ""}${ci}`}
            className="block w-full min-h-[56px] px-4 py-3 rounded-xl border-2 border-border bg-background text-base leading-7 no-underline text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
          >
            {c}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs text-foreground/50 text-center">
        答えは保存していません。気楽にどうぞ。
      </p>
    </div>
  );
}
