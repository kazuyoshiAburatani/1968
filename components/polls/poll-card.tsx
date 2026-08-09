"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { votePoll, commentOnPoll } from "@/app/polls/actions";
import { PhotoPicker } from "@/components/photo-picker";
import { PhotoView } from "@/components/photo-view";
import { pollImageUrl, postImageUrl } from "@/lib/media";
import { pollIcon } from "@/lib/poll-icon";
import {
  choiceLabel,
  hasOptionImages,
  percent,
  showAsPercent,
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
//
// 写真について。
// 選択肢に写真があるときは、写真を主役にして、その下に名前を置く。
// 「りぼん」「なかよし」と字で並んでいるより、表紙が二枚並んでいるほうが速い。
// 記憶を引き出すのに言葉を介さずに済むので、考える前に指が動く。
// 写真が入っていないお題は今までどおり字だけで出す。写真の有無で作りを変えるが、
// 押せる場所の大きさと並び方は変えない。
//
// 設問の前に出す絵について。
// 設問だけが縦に並ぶと、どれも同じ見た目になって「読む」作業になる。
// 左に小さな絵がひとつあるだけで、読む前に「野球の話だ」「テレビの話だ」と
// 分かって目が止まる。字を追うのが億劫な人ほど効く。
// 基本はアイコンにしてある。79 問すべてに写真は用意できないし、一部だけ写真だと、
// 写真の無い問いが見劣りして押されなくなる。アイコンなら全部に必ず付いて格が揃う。
// 写真（header_image）が入っている問いだけ、アイコンの代わりに写真を出す。

type Props = {
  poll: PollWithResult;
  /** 見出しの上に出す小さなラベル */
  eyebrow?: string;
  /** 席がある人か。写真を添えられるのはこの人だけ */
  canAttachPhoto?: boolean;
};

export function PollCard({
  poll,
  eyebrow = "今週の二択",
  canAttachPhoto = false,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  // サーバから渡った投票状況を初期値にして、以降はこの状態で描画する
  const [choice, setChoice] = useState<PollChoice | null>(poll.myChoice);
  const [comments, setComments] = useState<PollComment[]>(poll.comments);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [, startTransition] = useTransition();

  const voted = choice !== null;
  const withImages = hasOptionImages(poll);
  const headerUrl = pollImageUrl(poll.header_image);
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

  // 一言の送信。
  // 文章だけのときは、これまでどおり押した瞬間に出す（送信は裏で走らせる）。
  // 写真があるときは、送り終わるまで待つ。手元のファイルを先に出すことはできるが、
  // 「出たのに保存に失敗して消える」がいちばん困るので、写真のときだけ待つ。
  async function submitComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!choice) return;
    if (!text && !photo) return;
    if (sending) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("poll_id", poll.id);
    fd.set("comment", text);

    if (!photo) {
      // これまでどおりの即時表示。写真が無いなら待つ理由がない
      const optimistic: PollComment = {
        choice,
        comment: text,
        image_path: null,
        created_at: "",
      };
      setComments((prev) => [optimistic, ...prev]);
      setDraft("");
      setError(null);
      startTransition(async () => {
        const res = await commentOnPoll(fd);
        if (!res.ok) {
          setComments((prev) => prev.filter((c) => c !== optimistic));
          setDraft(text); // 書いた文章は捨てない
          setError(res.message);
        }
      });
      return;
    }

    setSending(true);
    setError(null);
    const res = await commentOnPoll(fd);
    setSending(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }

    setComments((prev) => [
      {
        choice,
        comment: text,
        image_path: res.imagePath ?? null,
        created_at: "",
      },
      ...prev,
    ]);
    setDraft("");
    setPhoto(null);
    formRef.current?.reset();
  }

  return (
    <section
      id={`poll-${poll.id}`}
      className="rounded-2xl border-2 border-accent/50 bg-accent/5 p-5 sm:p-6 scroll-mt-20"
    >
      {/* 写真が指定されている問いだけ、設問の上に大きく出す */}
      {headerUrl && (
        <div className="relative -mx-5 -mt-5 mb-4 aspect-[16/7] overflow-hidden rounded-t-xl sm:-mx-6 sm:-mt-6">
          <Image
            src={headerUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
            priority={false}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* 写真があるときはアイコンを重ねない。二つ並ぶとどちらも意味を失う */}
        {!headerUrl && (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <i className={`${pollIcon(poll)} text-[26px]`} aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-accent">{eyebrow}</div>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold leading-snug">
            {poll.question}
          </h2>
        </div>
      </div>

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

          {/* 写真があるときも無いときも、押せる場所の並びは同じ。
              スマートフォンでは縦に積み、横並びにできる幅があれば 2 つ並べる。 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ChoiceButton
              label={poll.option_a}
              imageUrl={withImages ? pollImageUrl(poll.option_a_image) : null}
              onClick={() => vote("a")}
            />
            <ChoiceButton
              label={poll.option_b}
              imageUrl={withImages ? pollImageUrl(poll.option_b_image) : null}
              onClick={() => vote("b")}
            />
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
              imageUrl={withImages ? pollImageUrl(poll.option_a_image) : null}
              pct={percent(countA, total)}
              count={countA}
              total={total}
              mine={choice === "a"}
            />
            <ResultBar
              label={poll.option_b}
              imageUrl={withImages ? pollImageUrl(poll.option_b_image) : null}
              pct={percent(countB, total)}
              count={countB}
              total={total}
              mine={choice === "b"}
            />
            {(countOther > 0 || choice === "other") && (
              <ResultBar
                label="どちらでもない・覚えていない"
                imageUrl={null}
                pct={percent(countOther, total)}
                count={countOther}
                total={total}
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
          <form ref={formRef} onSubmit={submitComment} className="mt-4">
            <div className="flex flex-col sm:flex-row gap-2">
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
                disabled={(draft.trim().length === 0 && !photo) || sending}
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-5 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white active:bg-primary active:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
              >
                {sending ? "送っています" : "添える"}
              </button>
            </div>

            {/* 写真は席がある人だけ。ゲストが押したら席づくりへ案内する */}
            <PhotoPicker
              name="photo"
              enabled={canAttachPhoto}
              disabled={sending}
              onChange={setPhoto}
              joinHref={`/join?next=${encodeURIComponent(`/#poll-${poll.id}`)}`}
              label="写真を添える"
              className="mt-2"
            />
          </form>

          {comments.length > 0 && (
            <ul className="mt-4 space-y-2">
              {comments.map((c, i) => {
                const url = postImageUrl(c.image_path);
                return (
                  <li
                    key={`${i}-${c.comment}-${c.image_path ?? ""}`}
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
                    {url && (
                      <PhotoView
                        url={url}
                        alt={`「${choiceLabel(poll, c.choice)}」に添えられた写真`}
                        className="mt-2"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// 選択肢のボタン。
// 写真があるときは写真を上に大きく、名前を下に置く。押せる範囲は全体。
// 写真が無いときは、これまでと寸分同じ見た目にする。
function ChoiceButton({
  label,
  imageUrl,
  onClick,
}: {
  label: string;
  imageUrl: string | null;
  onClick: () => void;
}) {
  if (!imageUrl) {
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

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-xl border-2 border-border bg-background text-left hover:border-primary active:border-primary transition-colors"
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 92vw, 320px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </span>
      <span className="flex min-h-[56px] items-center justify-center px-4 py-3 text-lg font-bold group-hover:bg-primary/5 group-active:bg-primary/15 transition-colors">
        {label}
      </span>
    </button>
  );
}

function ResultBar({
  label,
  imageUrl,
  pct,
  count,
  total,
  mine,
  muted = false,
}: {
  label: string;
  imageUrl: string | null;
  pct: number;
  count: number;
  total: number;
  mine: boolean;
  muted?: boolean;
}) {
  // 人数が少ないうちは割合を出さない。3人しかいないのに「67%」と出すと、
  // 統計の見た目だけがあって中身が無いので、かえって場の小ささが目立つ。
  const asPercent = showAsPercent(total);
  return (
    <div className="flex items-start gap-3">
      {/* 結果でも写真を残す。どちらを選んだのかが、字を読まずに分かる */}
      {imageUrl && (
        <span className="relative mt-0.5 block size-14 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="56px"
            className={mine ? "object-cover" : "object-cover opacity-60"}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
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
            {asPercent ? (
              <>
                {pct}%
                <span className="ml-1 text-xs font-normal text-foreground/60">
                  {count}人
                </span>
              </>
            ) : (
              <>
                {count}人
                <span className="ml-1 text-xs font-normal text-foreground/60">
                  / {total}人中
                </span>
              </>
            )}
          </span>
        </div>
        <div
          className="mt-1 h-3 w-full rounded-full bg-muted overflow-hidden"
          role="img"
          aria-label={
            asPercent
              ? `${label} ${pct}パーセント`
              : `${label} ${total}人中${count}人`
          }
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
    </div>
  );
}
