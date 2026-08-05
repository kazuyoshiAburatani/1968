import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPolls } from "@/lib/polls";
import { peekVoterKey } from "@/lib/voter-key";
import { loadTopics, loadTopicResponses } from "@/lib/topics";
import { PollCard } from "@/components/polls/poll-card";
import { TopicSection } from "@/components/topics/topic-section";
import { TodayStrip } from "@/components/home/today-strip";
import { SpreadCards } from "@/components/home/spread-cards";
import { StoryRail } from "@/components/home/story-rail";
import { FeaturedLetters } from "@/components/home/featured-letters";

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
//   1. 今週の二択      … 初回参加 8.8/10。ゲストのまま 1 タップで参加できる最初の一歩
//   2. 穴埋めのお題    … 二択で温まった人が、1 行だけ書く
//   3. 今日は何の日    … 毎日きっかけを置き、LINE 配信へ橋渡しする
//   4. 年表・検定      … 拡散装置。人に見せたくなる自分ごとの結果を返す
//   5. 企画記事        … 唯一、自発的な長文と会員同士の返信が出た形式
//   6. 今週のお便り    … 採用された投稿を掲げる承認装置
//
// 上のほうに登録の壁を置かないこと、そして「0 件」を目立つ場所に出さないことが要点。
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

  let myNickname = "あなた";
  let myAvatarPath: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    myNickname = (data?.nickname as string | undefined) ?? "あなた";
    myAvatarPath = (data?.avatar_url as string | undefined) ?? null;
  }

  const voterKey = await peekVoterKey();

  const [polls, topics] = await Promise.all([
    loadPolls(supabase, { limit: 2, voterKey }),
    loadTopics(supabase, { limit: 4 }),
  ]);

  const topicData = await loadTopicResponses(supabase, topics, {
    currentUserId: user?.id ?? null,
    previewOnly: true,
  });

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
      {params.error && (
        <p
          role="alert"
          className="rounded-2xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm leading-7"
        >
          {params.error}
        </p>
      )}

      {!user && <GuestIntro />}

      {/* 1. 今週の二択 */}
      {polls.length > 0 && (
        <div id="polls" className="space-y-6 scroll-mt-20">
          {polls.map((p, i) => (
            <PollCard
              key={p.id}
              poll={p}
              returnPath="/"
              eyebrow={i === 0 ? "今週の二択" : "もうひとつの二択"}
            />
          ))}
        </div>
      )}

      {/* 3. 今日は何の日、毎日ひとつだけ */}
      <TodayStrip />

      {/* 2. 穴埋めのお題 */}
      {topicData.length > 0 && (
        <div className="space-y-10">
          {topicData.map((d, i) => (
            <TopicSection
              key={d.topic.id}
              data={d}
              loggedIn={!!user}
              myNickname={myNickname}
              myAvatarPath={myAvatarPath}
              returnPath="/"
              eyebrow={
                i === 0
                  ? d.topic.format === "fill_blank"
                    ? "今週の穴埋め"
                    : "今週のお題"
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* 4. 年表・検定 */}
      <SpreadCards />

      {/* 5. 企画記事 */}
      <StoryRail />

      {/* 6. 今週のお便り */}
      <FeaturedLetters />

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
