import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { groupByEra, type ArchiveTopic } from "@/lib/archive";
import { loadTopicArchive } from "@/lib/archive-server";
import { LAUNCH_LABEL, isBeforeLaunch } from "@/lib/launch";

export const metadata: Metadata = {
  title: "これまでのお題",
  description:
    "昭和43年度生まれを中心にしたお題を、小学校のころから二十代まで年代ごとに並べています。一行だけ書けば終わりです。",
};

// これまでのお題の一覧。
//
// 個別ページ（/topics/[id]）はもともとあったが、一覧が無かったので、
// URL を知らないと辿り着けなかった。ホームに出るのは 4 問だけで、
// そこから外れたお題は「みんなの新着」で誰かの回答を偶然見かけない限り
// 見つけようがない状態だった。
//
// 二択と分けているのは、やることが違うため。
// 二択は指一本で終わるが、お題は一行でも文章を書く。
// 同じ一覧に混ぜると、書く気のあるときに二択が邪魔になり、
// 気軽に押したいだけのときにお題が重く見える。
export default async function TopicsArchivePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const topics = await loadTopicArchive(supabase, user?.id ?? null);
  const groups = groupByEra(topics);
  const mine = topics.filter((t) => t.mine).length;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
          これまでのお題
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/80">
          小学校のころから二十代まで、これまでに出した{topics.length}
          題を年代ごとに並べています。
          <br />
          一行だけ書けば終わりです。長く書かなくて構いません。
        </p>
        {mine > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            <i className="ri-quill-pen-line" aria-hidden />
            {mine}題に書いています
          </p>
        )}
      </header>

      {topics.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border/60 bg-muted/40 p-6 text-center leading-8">
          {isBeforeLaunch()
            ? `${LAUNCH_LABEL}から始めます。まずは小学校のころの話から。`
            : "いま出ているものはありません。近いうちにまた出します。"}
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((g) => (
            <section key={g.era}>
              <h2 className="flex items-center gap-3 text-lg font-bold">
                <span className="whitespace-nowrap">{g.heading}</span>
                <span className="h-px flex-1 bg-border" aria-hidden />
                <span className="whitespace-nowrap text-sm font-normal text-foreground/60">
                  {g.items.length}題
                </span>
              </h2>
              <ul className="mt-3 space-y-2">
                {g.items.map((t) => (
                  <li key={t.id}>
                    <TopicRowLink topic={t} />
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

function TopicRowLink({ topic }: { topic: ArchiveTopic }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-3.5 no-underline transition-colors hover:border-primary/60 hover:bg-primary/5 active:bg-primary/10"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <i
          className={`${topic.format === "fill_blank" ? "ri-quill-pen-line" : "ri-chat-3-line"} text-[26px]`}
          aria-hidden
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold leading-7 text-foreground">
          {topic.title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {topic.mine ? (
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              <i className="ri-check-line text-sm" aria-hidden />
              書きました
            </span>
          ) : (
            <span className="text-foreground/60">まだ書いていません</span>
          )}
          {/* 0 件のときは出さない。過疎を目立たせない */}
          {topic.total > 0 && (
            <span className="text-foreground/50">{topic.total}人が回答</span>
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
