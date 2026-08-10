import Link from "next/link";
import { ResponseCard } from "./response-card";
import { ResponseComposer } from "./response-composer";
import { writePath } from "@/lib/topic-path";
import type { TopicWithResponses } from "@/lib/topics";

// お題ひとつぶんの表示。ホームのフィードとお題詳細の両方で使う。
//
// 穴埋め形式のお題は、題そのものが入力欄の見出しになる。
// 「初めて自分のお小遣いで買ったレコードやカセットは【　　】」のように、
// 何を書けばいいかが一目で分かる形にしておくと、書き出しの心理的な壁がほぼ消える。

type Props = {
  data: TopicWithResponses;
  loggedIn: boolean;
  myNickname: string;
  myAvatarPath: string | null | undefined;
  returnPath: string;
  /** 詳細ページでは全件表示するので「全て見る」を出さない */
  showMoreLink?: boolean;
  /**
   * 入力欄の出し方。
   * inline は入力欄をその場に置く（お題1件だけの詳細ページ向け）。
   * link は「一行だけ書く」ボタンだけを置き、書き込み専用ページへ送る（一覧向け）。
   */
  composer?: "inline" | "link";
  eyebrow?: string;
};

export function TopicSection({
  data,
  loggedIn,
  myNickname,
  myAvatarPath,
  returnPath,
  showMoreLink = true,
  eyebrow,
  composer = "inline",
}: Props) {
  const { topic, responses, totalCount } = data;
  const isFill = topic.format === "fill_blank";
  const shownCount =
    responses.length + responses.reduce((n, r) => n + r.replies.length, 0);

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <i
            className={isFill ? "ri-edit-box-line" : "ri-chat-quote-line"}
            aria-hidden
          />
          {eyebrow ?? (isFill ? "穴埋めのお題" : "お題")}
          {topic.era && (
            <span className="ml-1 font-normal text-foreground/50">
              {topic.era}のころ
            </span>
          )}
        </div>

        <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-snug">
          {showMoreLink ? (
            <Link
              href={`/topics/${topic.id}`}
              className="text-foreground no-underline hover:underline"
            >
              {topic.title}
            </Link>
          ) : (
            topic.title
          )}
        </h2>

        {topic.body && (
          <p className="mt-2 text-base leading-8 text-foreground/80 whitespace-pre-wrap">
            {topic.body}
          </p>
        )}

        {totalCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-foreground/60">
            <i className="ri-chat-3-line" aria-hidden />
            <span>{totalCount} 人が答えています</span>
          </div>
        )}
      </div>

      {composer === "link" ? (
        /* 一覧では入力欄を出さない。
           お題・入力欄・他人の回答が縦に3組並ぶと、スマホでは読めたものではない。
           書く操作は、入力欄だけが載った専用ページへ送る。 */
        <p className="text-center">
          <Link
            href={writePath(topic.id)}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-full border-2 border-primary text-primary text-base font-bold no-underline hover:bg-primary hover:text-white transition-colors"
          >
            <i className="ri-quill-pen-line text-xl" aria-hidden />
            一行だけ書く
          </Link>
        </p>
      ) : (
      <ResponseComposer
        topicId={topic.id}
        nickname={myNickname}
        avatarPath={myAvatarPath}
        guest={!loggedIn}
        format={topic.format}
        examples={topic.blank_examples ?? []}
        returnPath={returnPath}
      />
      )}

      {responses.length === 0 ? (
        <p className="text-center text-sm leading-7 text-foreground/60 py-4">
          このお題は、まだ誰も答えていません。
          <br />
          最初の一行を置いていきませんか。
        </p>
      ) : (
        <div className="space-y-3">
          {responses.map((r) => (
            <ResponseCard
              key={r.id}
              responseId={r.id}
              topicId={topic.id}
              nickname={r.nickname}
              prefecture={r.prefecture}
              avatarUrl={r.avatarUrl}
              body={r.body}
              media={r.media}
              createdAt={r.createdAt}
              reactionCounts={r.reactionCounts}
              myReaction={r.myReaction}
              replies={r.replies}
              loggedIn={loggedIn}
              returnPath={returnPath}
              isOperator={r.isOperator}
              isFoundingMember={r.isFoundingMember}
              isMine={r.isMine}
              featuredAt={r.featuredAt}
              featuredNote={r.featuredNote}
            />
          ))}

          {showMoreLink && totalCount > shownCount && (
            <div className="text-center">
              <Link
                href={`/topics/${topic.id}`}
                className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white transition-colors no-underline"
              >
                答え {totalCount} 件をぜんぶ見る →
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
