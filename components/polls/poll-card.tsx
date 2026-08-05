"use client";

import { useState, useTransition } from "react";
import { votePoll, commentOnPoll } from "@/app/polls/actions";
import {
  choiceLabel,
  percent,
  type PollChoice,
  type PollComment,
  type PollWithResult,
} from "@/lib/polls";

// 二択投票カード。
//
// なぜクライアントコンポーネントなのか。
// この施策の本体は「押した瞬間に、同じ学年の割合が返ってくる」ことそのものにある。
// サーバ往復を待ってから描き替える作りにすると、タップから表示まで数秒かかり、
// 「1 タップで参加できる」という体験が丸ごと失われる（実際にそうなって作り直した）。
// なので、
//   1. タップした瞬間にローカルの状態を進めて結果を出す
//   2. 保存は裏で走らせ、成功しても何もしない
//   3. 失敗したときだけ元に戻して、理由を出す
// という順にしてある。集計値はあらかじめ props で渡っているので、待つ必要がない。
//
// 得票率を投票前に描画しないのは、先に結果が見えると回答が歪むため。
// 数値自体はページに含まれるが、目的は「選ぶ前に見せない」ことなので、これで足りる。
//
// その他について。
// 二択は「どちらかに必ず当てはまる」前提だが、見ていなかった、地域に無かった、
// 買ってもらえなかった、という人は必ずいる。選べないまま素通りされると、
// その人はそこで参加をやめてしまうので、受け皿を置く。
// ただし A・B と同格に並べると二択の緊張感が消えるため、下に控えめに置く。
//
// 解説（blurb）は投票前、設問のすぐ下に出す。
// 投票後に出していた頃は、結果と一言入力欄のあいだに挟まって入力欄が埋もれていた。

type Props = {
  poll: PollWithResult;
  /** 見出しの上に出す小さなラベル */
  eyebrow?: string;
};

export function PollCard({ poll, eyebrow = "今週の二択" }: Props) {
  // サーバから渡った投票状況を初期値にして、以降はこの状態で描画する
  const [choice, setChoice] = useState<PollChoice | null>(poll.myChoice);
  const [comments, setComments] = useState<PollComment[]>(poll.comments);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const voted = choice !== null;
  // 自分の 1 票を足した数。サーバの返事を待たずに出す
  const justVoted = poll.myChoice === null && choice !== null;
  const bump = (c: PollChoice) => (justVoted && choice === c ? 1 : 0);
  const countA = poll.countA + bump("a");
  const countB = poll.countB + bump("b");
  const countOther = poll.countOther + bump("other");
  const total = countA + countB + countOther;

  function vote(next: PollChoice) {
    if (voted) return;
    setError(null);
    setChoice(next); // ここで即座に結果表示に切り替わる
    startTransition(async () => {
      const res = await votePoll(poll.id, next);
      if (!res.ok) {
        setChoice(null); // 保存できなかったので選択前に戻す
        setError(res.message);
      }
    });
  }

  function submitComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !choice) return;

    const optimistic: PollComment = {
      choice,
      comment: text,
      created_at: "",
    };
    setComments((prev) => [optimistic, ...prev]);
    setDraft("");
    setError(null);

    startTransition(async () => {
      const res = await commentOnPoll(poll.id, text);
      if (!res.ok) {
        setComments((prev) => prev.filter((c) => c !== optimistic));
        setDraft(text); // 書いた文章は捨てない
        setError(res.message);
      }
    });
  }

  return (
    <section
      id={`poll-${poll.id}`}
      className="rounded-2xl border-2 border-accent/50 bg-accent/5 p-5 sm:p-6 scroll-mt-20"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-accent">
        <i className="ri-scales-3-line text-base" aria-hidden />
        {eyebrow}
      </div>

      <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-snug">
        {poll.question}
      </h2>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-notification/40 bg-notification/10 px-3 py-2 text-sm leading-7"
        >
          {error}
        </p>
      )}

      {!voted ? (
        <>
          {poll.blurb && (
            <p className="mt-3 rounded-xl bg-background/70 border border-border/60 p-3 text-sm leading-7 text-foreground/80">
              {poll.blurb}
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ChoiceButton label={poll.option_a} onClick={() => vote("a")} />
            <ChoiceButton label={poll.option_b} onClick={() => vote("b")} />
          </div>

          {/* どちらも選べない人の受け皿。A・B より控えめに置く */}
          <button
            type="button"
            onClick={() => vote("other")}
            className="mt-2 w-full min-h-[var(--spacing-tap)] px-4 py-2 rounded-xl border border-border bg-background/60 text-sm text-foreground/70 hover:bg-background hover:text-foreground active:bg-muted transition-colors"
          >
            どちらでもない・覚えていない
          </button>

          <p className="mt-3 text-xs leading-6 text-foreground/60">
            選ぶと、同じ学年のみなさんの割合が出ます。登録は要りません。
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            <ResultBar
              label={poll.option_a}
              pct={percent(countA, total)}
              count={countA}
              mine={choice === "a"}
            />
            <ResultBar
              label={poll.option_b}
              pct={percent(countB, total)}
              count={countB}
              mine={choice === "b"}
            />
            {(countOther > 0 || choice === "other") && (
              <ResultBar
                label="どちらでもない・覚えていない"
                pct={percent(countOther, total)}
                count={countOther}
                mine={choice === "other"}
                muted
              />
            )}
          </div>

          <p className="mt-3 text-sm text-foreground/70">
            {total} 人が回答。あなたは
            <span className="font-bold text-foreground">
              「{choiceLabel(poll, choice)}」
            </span>
            を選びました。
          </p>

          {/* 一言コメント、任意。1タップの参加から会話への橋渡し */}
          <form
            onSubmit={submitComment}
            className="mt-4 flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              name="comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={200}
              placeholder={
                choice === "other"
                  ? "よければ、あなたの場合は何だったか教えてください"
                  : "ひとことどうぞ（書かなくても大丈夫です）"
              }
              className="flex-1 min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-5 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white active:bg-primary active:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
            >
              添える
            </button>
          </form>

          {comments.length > 0 && (
            <ul className="mt-4 space-y-2">
              {comments.map((c, i) => (
                <li
                  key={`${i}-${c.comment}`}
                  className="rounded-xl bg-background border border-border/60 px-3 py-2 text-sm leading-7"
                >
                  <span
                    className={
                      "mr-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium " +
                      (c.choice === "a"
                        ? "bg-primary/10 text-primary"
                        : c.choice === "b"
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-foreground/60")
                    }
                  >
                    {choiceLabel(poll, c.choice)}
                  </span>
                  {c.comment}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ChoiceButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[64px] px-4 py-3 rounded-xl border-2 border-border bg-background text-lg font-bold hover:border-primary hover:bg-primary/5 active:bg-primary/15 active:border-primary transition-colors"
    >
      {label}
    </button>
  );
}

function ResultBar({
  label,
  pct,
  count,
  mine,
  muted = false,
}: {
  label: string;
  pct: number;
  count: number;
  mine: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span
          className={
            mine
              ? "font-bold text-foreground"
              : muted
                ? "text-foreground/60"
                : "text-foreground/80"
          }
        >
          {label}
          {mine && (
            <span className="ml-1 text-xs text-primary font-medium">
              （あなた）
            </span>
          )}
        </span>
        <span className="tabular-nums font-bold">
          {pct}%
          <span className="ml-1 text-xs font-normal text-foreground/60">
            {count}人
          </span>
        </span>
      </div>
      <div
        className="mt-1 h-3 w-full rounded-full bg-muted overflow-hidden"
        role="img"
        aria-label={`${label} ${pct}パーセント`}
      >
        <div
          className={
            "h-full rounded-full transition-[width] duration-500 ease-out " +
            (mine ? "bg-primary" : muted ? "bg-border" : "bg-accent")
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
