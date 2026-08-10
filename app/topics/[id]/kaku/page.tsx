import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTopics } from "@/lib/topics";
import { ResponseComposer } from "@/components/topics/response-composer";
import { topicPath } from "@/lib/topic-path";

type Props = { params: Promise<{ id: string }> };

// お題への書き込み専用ページ。
//
// なぜ独立したページなのか。
// もとは一覧の中に入力欄を直接置いていた。ホームにはお題が3件並ぶので、
// 「お題 → 入力欄 → 他人の回答」が縦に3組つながり、スマホでは
// どこに何を書けばいいのか分からない画面になっていた。
//
// ポップアップにしなかったのには理由がある。
//  ・スマホのキーボードが出ると、固定表示の枠は入力欄ごと隠れることがある
//  ・枠の外に指が触れただけで閉じ、書きかけの文章が消える。
//    この場で「書いた文章を捨てる」のは、二度と書いてもらえなくなる失敗
//  ・URL が無いので、戻るボタンの動きが読めず、開き直すこともできない
// 本物のページなら、この3つがすべて起きない。
//
// この画面には他人の回答を出さない。
// 書くために来た人にとって、他人の回答は「自分のはつまらないかも」と
// 手を止めさせる材料にしかならない。読むのは書いたあとでいい。
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("topics")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  const title = (data?.title as string | undefined) ?? "お題";
  return {
    title: `${title} に書く`,
    // 入力するだけの画面なので、検索結果に出す意味がない
    robots: { index: false },
  };
}

export default async function TopicWritePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const topics = await loadTopics(supabase, { topicId: id });
  const topic = topics[0];
  if (!topic) notFound();

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

  const isFill = topic.format === "fill_blank";
  const examples = topic.blank_examples ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <p className="text-sm">
        <Link
          href={topicPath(topic.id)}
          className="no-underline hover:underline text-foreground/70"
        >
          ← やめて、お題に戻る
        </Link>
      </p>

      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <i
            className={isFill ? "ri-edit-box-line" : "ri-chat-quote-line"}
            aria-hidden
          />
          {isFill ? "穴埋めのお題" : "お題"}
          {topic.era && (
            <span className="ml-1 font-normal text-foreground/50">
              {topic.era}のころ
            </span>
          )}
        </div>

        <h1 className="mt-2 text-xl sm:text-2xl font-bold leading-snug">
          {topic.title}
        </h1>

        {topic.body && (
          <p className="mt-2 text-base leading-8 text-foreground/80 whitespace-pre-wrap">
            {topic.body}
          </p>
        )}
      </div>

      <ResponseComposer
        topicId={topic.id}
        nickname={myNickname}
        avatarPath={myAvatarPath}
        guest={!user}
        format={topic.format}
        examples={examples}
        returnPath={topicPath(topic.id)}
        standalone
      />

      <p className="text-center text-xs leading-6 text-foreground/60">
        送ると、このお題のページに戻ります。
        <br />
        ほかの方の回答は、そちらで読めます。
      </p>
    </div>
  );
}
