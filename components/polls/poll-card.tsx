import { votePoll, commentOnPoll } from "@/app/polls/actions";
import {
  choiceLabel,
  percent,
  type PollChoice,
  type PollWithResult,
} from "@/lib/polls";

// 二択投票カード。
//
// 設計上ゆずれない点、
//  ・登録を求めない。ゲストのまま押せる
//  ・押す前に得票率を見せない。先に結果が見えると素直な回答が歪む
//  ・押した直後は同じ場所に留まり、結果と一言欄だけを出す。
//    ここで会員登録のモーダルを被せると「結局これが目的か」と信頼が崩れる
//  ・一言コメントはあくまで任意。書かずに次へ行ける
//
// 「その他」について。
// 二択は「どちらかに必ず当てはまる」前提だが、見ていなかった、地域に無かった、
// 買ってもらえなかった、という人は必ずいる。選べないまま素通りされると、
// その人はそこで参加をやめてしまうので、受け皿を置く。
// ただし A・B と同格に並べると二択の緊張感が消えるため、下に控えめに置く。
//
// 解説（blurb）の位置について。
// 当初は投票後に出していたが、結果と一言入力欄のあいだに挟まって
// 入力欄が埋もれてしまった。一言コメントは 1 タップの参加から会話へ渡す要なので、
// そこを邪魔しないよう、解説は投票前に移した。
// 当時の背景を先に読んでもらったほうが記憶も戻りやすい。
// そのぶん、解説にどちらが多数派かを匂わせる書き方をしないこと（運営画面にも明記）。

type Props = {
  poll: PollWithResult;
  returnPath: string;
  /** 見出しの上に出す小さなラベル */
  eyebrow?: string;
};

export function PollCard({ poll, returnPath, eyebrow = "今週の二択" }: Props) {
  const voted = poll.myChoice !== null;

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

      {voted ? (
        <VotedView poll={poll} returnPath={returnPath} />
      ) : (
        <UnvotedView poll={poll} returnPath={returnPath} />
      )}
    </section>
  );
}

// 投票前、解説を読んでから選んでもらう
function UnvotedView({
  poll,
  returnPath,
}: {
  poll: PollWithResult;
  returnPath: string;
}) {
  return (
    <>
      {poll.blurb && (
        <p className="mt-3 rounded-xl bg-background/70 border border-border/60 p-3 text-sm leading-7 text-foreground/80">
          {poll.blurb}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ChoiceButton
          pollId={poll.id}
          choice="a"
          label={poll.option_a}
          returnPath={returnPath}
        />
        <ChoiceButton
          pollId={poll.id}
          choice="b"
          label={poll.option_b}
          returnPath={returnPath}
        />
      </div>

      {/* どちらも選べない人の受け皿。A・B より控えめに置く */}
      <form action={votePoll} className="mt-2">
        <input type="hidden" name="poll_id" value={poll.id} />
        <input type="hidden" name="choice" value="other" />
        <input type="hidden" name="return_path" value={returnPath} />
        <button
          type="submit"
          className="w-full min-h-[var(--spacing-tap)] px-4 py-2 rounded-xl border border-border bg-background/60 text-sm text-foreground/70 hover:bg-background hover:text-foreground transition-colors"
        >
          どちらでもない・覚えていない
        </button>
      </form>

      <p className="mt-3 text-xs leading-6 text-foreground/60">
        選ぶと、同じ学年のみなさんの割合が出ます。登録は要りません。
      </p>
    </>
  );
}

// 投票後、結果のすぐ下に一言欄を置く
function VotedView({
  poll,
  returnPath,
}: {
  poll: PollWithResult;
  returnPath: string;
}) {
  const pa = percent(poll.countA, poll.total);
  const pb = percent(poll.countB, poll.total);
  const po = percent(poll.countOther, poll.total);
  const showOther = poll.countOther > 0 || poll.myChoice === "other";
  const choseOther = poll.myChoice === "other";

  return (
    <>
      <div className="mt-4 space-y-3">
        <ResultBar
          label={poll.option_a}
          pct={pa}
          count={poll.countA}
          mine={poll.myChoice === "a"}
        />
        <ResultBar
          label={poll.option_b}
          pct={pb}
          count={poll.countB}
          mine={poll.myChoice === "b"}
        />
        {showOther && (
          <ResultBar
            label="どちらでもない・覚えていない"
            pct={po}
            count={poll.countOther}
            mine={choseOther}
            muted
          />
        )}
      </div>

      <p className="mt-3 text-sm text-foreground/70">
        {poll.total} 人が回答。あなたは
        <span className="font-bold text-foreground">
          「{choiceLabel(poll, poll.myChoice as PollChoice)}」
        </span>
        を選びました。
      </p>

      {/* 一言コメント、任意。1タップの参加から会話への橋渡し */}
      <form
        action={commentOnPoll}
        className="mt-4 flex flex-col sm:flex-row gap-2"
      >
        <input type="hidden" name="poll_id" value={poll.id} />
        <input type="hidden" name="return_path" value={returnPath} />
        <input
          type="text"
          name="comment"
          maxLength={200}
          placeholder={
            choseOther
              ? "よければ、あなたの場合は何だったか教えてください"
              : "ひとことどうぞ（書かなくても大丈夫です）"
          }
          className="flex-1 min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-5 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white transition-colors"
        >
          添える
        </button>
      </form>

      {poll.comments.length > 0 && (
        <ul className="mt-4 space-y-2">
          {poll.comments.map((c, i) => (
            <li
              key={i}
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
  );
}

function ChoiceButton({
  pollId,
  choice,
  label,
  returnPath,
}: {
  pollId: string;
  choice: PollChoice;
  label: string;
  returnPath: string;
}) {
  return (
    <form action={votePoll} className="contents">
      <input type="hidden" name="poll_id" value={pollId} />
      <input type="hidden" name="choice" value={choice} />
      <input type="hidden" name="return_path" value={returnPath} />
      <button
        type="submit"
        className="w-full min-h-[64px] px-4 py-3 rounded-xl border-2 border-border bg-background text-lg font-bold hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
      >
        {label}
      </button>
    </form>
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
            "h-full rounded-full " +
            (mine ? "bg-primary" : muted ? "bg-border" : "bg-accent")
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
