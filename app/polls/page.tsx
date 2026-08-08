import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { peekVoterKey } from "@/lib/voter-key";
import { groupByEra, type ArchivePoll } from "@/lib/archive";
import { loadPollArchive } from "@/lib/archive-server";
import { pollIcon } from "@/lib/poll-icon";
import { pollImageUrl } from "@/lib/media";

export const metadata: Metadata = {
  title: "これまでの二択",
  description:
    "昭和43年度生まれの二択を、小学校のころから二十代まで年代ごとに並べています。登録なしで答えられます。",
};

// これまでの二択の一覧。
//
// ホームに出るのは新しい 2 問だけで、そこから外れた問いは、これまで
// サイト上のどこからも見られなかった。在庫は 60 問あるので、
// 週 2 問ずつ出していくと大半が一度も見られないまま流れていくことになる。
//
// 年代で区切って並べているのは、配信順の一列にすると数が増えたときに
// 「長い一覧」になって途中でやめられるため。小学校から順にたどる形にすると、
// 自分の年表をなぞる感覚になり、ひとつ答えると隣も答えたくなる。
//
// 「答えた／まだ」を出しているのは、残りを埋めたくなる作りにするため。
// ただし未回答を赤字で急かすようなことはしない。急かされると閉じられる。
export default async function PollsArchivePage() {
  const supabase = await createSupabaseServerClient();
  const voterKey = await peekVoterKey();
  const polls = await loadPollArchive(supabase, voterKey);
  const groups = groupByEra(polls);

  const answered = polls.filter((p) => p.myChoice !== null).length;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
          これまでの二択
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/80">
          小学校のころから二十代まで、これまでに出した{polls.length}
          問を年代ごとに並べています。
          <br />
          どれも指一本で答えられます。登録は要りません。
        </p>
        {answered > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            <i className="ri-check-double-line" aria-hidden />
            {polls.length}問のうち {answered}問に回答ずみ
          </p>
        )}
      </header>

      {polls.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border/60 bg-muted/40 p-6 text-center leading-8">
          いま出ている二択はありません。
          <br />
          近いうちにまた出します。
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((g) => (
            <section key={g.era}>
              <h2 className="flex items-center gap-3 text-lg font-bold">
                <span className="whitespace-nowrap">{g.heading}</span>
                <span className="h-px flex-1 bg-border" aria-hidden />
                <span className="whitespace-nowrap text-sm font-normal text-foreground/60">
                  {g.items.length}問
                </span>
              </h2>
              <ul className="mt-3 space-y-2">
                {g.items.map((p) => (
                  <li key={p.id}>
                    <PollRowLink poll={p} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-10 text-center">
        <Link
          href="/"
          className="text-base no-underline hover:underline text-foreground/70"
        >
          ← ホームへ戻る
        </Link>
      </p>
    </div>
  );
}

function PollRowLink({ poll }: { poll: ArchivePoll }) {
  const thumb =
    poll.option_a_image && poll.option_b_image
      ? pollImageUrl(poll.option_a_image)
      : null;
  const chosen =
    poll.myChoice === "a"
      ? poll.option_a
      : poll.myChoice === "b"
        ? poll.option_b
        : poll.myChoice === "other"
          ? "どちらでもない"
          : null;

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-3.5 no-underline transition-colors hover:border-primary/60 hover:bg-primary/5 active:bg-primary/10"
    >
      {/* 写真がある問いは写真を、無ければアイコンを出す。大きさは揃える */}
      {thumb ? (
        <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted">
          <Image src={thumb} alt="" fill sizes="48px" className="object-cover" />
        </span>
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <i className={`${pollIcon(poll)} text-[26px]`} aria-hidden />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold leading-7 text-foreground">
          {poll.question}
        </span>
        <span className="mt-0.5 block text-sm leading-7 text-foreground/60">
          {poll.option_a} ／ {poll.option_b}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {chosen ? (
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              <i className="ri-check-line text-sm" aria-hidden />
              「{chosen}」を選びました
            </span>
          ) : (
            <span className="text-foreground/60">まだ答えていません</span>
          )}
          {/* 0 人のときは出さない。過疎を目立たせない */}
          {poll.total > 0 && (
            <span className="text-foreground/50">{poll.total}人が回答</span>
          )}
          {poll.comments > 0 && (
            <span className="text-foreground/50">
              一言 {poll.comments}件
            </span>
          )}
        </span>
      </span>

      <i
        className="ri-arrow-right-s-line mt-2 shrink-0 text-xl text-foreground/40"
        aria-hidden
      />
    </Link>
  );
}
