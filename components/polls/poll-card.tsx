import { votePoll, commentOnPoll } from "@/app/polls/actions";
import { percent, type PollWithResult } from "@/lib/polls";

// 二択投票カード。
//
// 設計上ゆずれない点、
//  ・登録を求めない。ゲストのまま押せる
//  ・押す前に得票率を見せない。先に結果が見えると素直な回答が歪む
//  ・押した直後は同じ場所に留まり、結果と一言欄だけを出す。
//    ここで会員登録のモーダルを被せると「結局これが目的か」と信頼が崩れる
//  ・一言コメントはあくまで任意。書かずに次へ行ける

type Props = {
  poll: PollWithResult;
  returnPath: string;
  /** 見出しの上に出す小さなラベル */
  eyebrow?: string;
};

export function PollCard({ poll, returnPath, eyebrow = "今週の二択" }: Props) {
  const voted = poll.myChoice !== null;
  const pa = percent(poll.countA, poll.total);
  const pb = percent(poll.countB, poll.total);

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

      {!voted ? (
        <>
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
          <p className="mt-3 text-xs text-foreground/60">
            選ぶと、同じ学年のみなさんの割合が出ます。登録は要りません。
          </p>
        </>
      ) : (
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
          </div>

          <p className="mt-3 text-sm text-foreground/70">
            {poll.total} 人が回答。あなたは
            <span className="font-bold text-foreground">
              「{poll.myChoice === "a" ? poll.option_a : poll.option_b}」
            </span>
            を選びました。
          </p>

          {poll.blurb && (
            <p className="mt-3 rounded-xl bg-background/70 border border-border/60 p-3 text-sm leading-7 text-foreground/80">
              {poll.blurb}
            </p>
          )}

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
              placeholder="ひとことどうぞ（書かなくても大丈夫です）"
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
                        : "bg-accent/20 text-accent")
                    }
                  >
                    {c.choice === "a" ? poll.option_a : poll.option_b}
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
  pollId,
  choice,
  label,
  returnPath,
}: {
  pollId: string;
  choice: "a" | "b";
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
}: {
  label: string;
  pct: number;
  count: number;
  mine: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className={mine ? "font-bold text-foreground" : "text-foreground/80"}>
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
            "h-full rounded-full " + (mine ? "bg-primary" : "bg-accent")
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
