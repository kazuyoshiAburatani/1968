import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPolls } from "@/lib/polls-server";
import { peekVoterKey } from "@/lib/voter-key";
import { PollCard } from "@/components/polls/poll-card";
import { TopicFeedSection } from "@/components/home/topic-feed-section";
import { TodayStrip } from "@/components/home/today-strip";
import { SpreadCards } from "@/components/home/spread-cards";
import { StoryRail } from "@/components/home/story-rail";
import { FeaturedLetters } from "@/components/home/featured-letters";
import { SectionSkeleton } from "@/components/home/section-skeleton";
import { LAUNCH_LABEL, isBeforeLaunch } from "@/lib/launch";
import { feedEyebrow } from "@/lib/day-label";

type Props = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
    posted?: string;
    welcome?: string;
  }>;
};

// ホーム。並び順そのものが施策になっている。
//
// 検証で見えた勝ち筋の動線をそのまま縦に並べてある。
//   1. 今日の二択      … 初回参加 8.8/10。ゲストのまま 1 タップで参加できる最初の一歩
//   2. 今日は何の日    … 毎日きっかけを置き、LINE 配信へ橋渡しする
//   3. 穴埋めのお題    … 二択で温まった人が、1 行だけ書く
//   4. 年表・検定      … 拡散装置。人に見せたくなる自分ごとの結果を返す
//   5. 企画記事        … 唯一、自発的な長文と会員同士の返信が出た形式
//   6. 今週のお便り    … 採用された投稿を掲げる承認装置
//
// 上のほうに登録の壁を置かないこと、「0 件」を目立つ場所に出さないこと、
// そして二択を何よりも先に描画することが要点。
//
// 描画の順番について。
// 二択より下は Suspense で包んで後から流し込む。ホーム全体では Supabase への
// 問い合わせが十数回走るため、全部待ってから描くと二択が押せるようになるまで
// 待たされる。二択は「開いた瞬間に押せる」ことが施策の本体なので、
// ここだけは最短で出す。
export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;

  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`);
  }
  if (params.error && params.error_code) {
    redirect(`/login?error=${encodeURIComponent(params.error_code)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 二択に必要なのはクッキー（識別子）と 2 クエリだけ。ここは待って描く
  const voterKey = await peekVoterKey();
  const polls = await loadPolls(supabase, { limit: 3, voterKey });
  const beforeLaunch = isBeforeLaunch();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-10">
      {params.welcome === "1" && (
        <p
          role="status"
          className="rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm leading-7"
        >
          席ができました。さきほど書いていただいた一行も、そのまま載っています。
        </p>
      )}
      {params.error && !params.error_code && (
        <p
          role="alert"
          className="rounded-2xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm leading-7"
        >
          {params.error}
        </p>
      )}

      {!user && <GuestIntro />}

      {/* 開店前。何も出ない画面をそのまま見せると「過疎っている」と読まれるので、
          開く日を先に伝える。公開日を過ぎたら自動で出なくなる */}
      {beforeLaunch && polls.length === 0 && <ComingSoon />}

      {/* 1. 今日の二択、最優先で描画する */}
      {polls.length > 0 && (
        <div id="polls" className="space-y-6 scroll-mt-20">
          {polls.map((p, i) => (
            <PollCard
              key={p.id}
              poll={p}
              eyebrow={feedEyebrow(p.published_at, "二択", i)}
              canAttachPhoto={user !== null}
            />
          ))}
        </div>
      )}

      {/* 以下は後から流し込む */}
      <Suspense fallback={<SectionSkeleton lines={2} label="今日は何の日" />}>
        <TodayStrip />
      </Suspense>

      <Suspense fallback={<SectionSkeleton lines={4} label="今週のお題" />}>
        <TopicFeedSection />
      </Suspense>

      <SpreadCards />

      <Suspense fallback={<SectionSkeleton lines={3} label="読みもの" />}>
        <StoryRail />
      </Suspense>

      <Suspense fallback={null}>
        <FeaturedLetters />
      </Suspense>

      {!user && (
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-center">
          <p className="text-base leading-8">
            ここまで、登録なしで読めています。
            <br />
            書いてみたくなったら、そのとき席をつくれば大丈夫です。
          </p>
          <Link
            href="/join"
            className="mt-4 inline-flex items-center justify-center min-h-[52px] px-8 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
          >
            30秒で席をつくる
          </Link>
          <p className="mt-2 text-xs text-foreground/60">
            ニックネームと生まれた日だけ。身分証は要りません。
          </p>
        </div>
      )}
    </div>
  );
}

// 開店前の案内。
// 「準備中です」だけだと、何を待てばいいのか分からないまま閉じられる。
// いつ・何が始まるのかを具体的に書いて、その日に思い出してもらう。
function ComingSoon() {
  return (
    <section className="rounded-2xl border-2 border-accent/50 bg-accent/5 p-6 text-center">
      <p className="text-xs font-bold text-accent">開店のお知らせ</p>
      <p className="mt-2 text-xl sm:text-2xl font-bold leading-snug">
        {LAUNCH_LABEL}から始めます
      </p>
      <p className="mt-3 text-base leading-8 text-foreground/80">
        まずは「小学校のころ」の話から。
        <br />
        二択と、一行で答えるお題が、その日から毎日ひとつずつ出ます。
      </p>
      <p className="mt-3 text-sm leading-7 text-foreground/60">
        小学校のころから中学、高校、二十代へと順に進みます。
        <br />
        どれも登録なしで読めます。
      </p>
    </section>
  );
}

// 未登録の人に最初に見せる 3 行。
// ここで長々と説明すると読まずに閉じるので、何の場所かだけを言って、すぐ下の二択へ渡す。
function GuestIntro() {
  return (
    <section className="text-center">
      <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
        1968年に生まれた学年の、
        <br className="sm:hidden" />
        語らいの場です
      </h1>
      <p className="mt-3 text-base leading-8 text-foreground/80">
        昭和43年度生まれ、いま57歳と58歳。
        <br />
        同じ年に同じテレビを見ていた人としか通じない話を、ここでしています。
      </p>
      <p className="mt-3 text-sm text-foreground/60">
        読むだけなら登録は要りません。まずは下の二択を、指一本でどうぞ。
      </p>
    </section>
  );
}
