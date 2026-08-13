import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { peekVoterKey } from "@/lib/voter-key";
import { loadPolls } from "@/lib/polls-server";
import { PollCard } from "@/components/polls/poll-card";
import { isFoundingWindow } from "@/lib/launch";

type Props = { params: Promise<{ id: string }> };

// 二択 1 問だけのページ。
//
// これが無いと、二択には URL が無いことになる。
// 「この問い、面白かったよ」と同級生に送ることができず、
// ホームから外れた瞬間に、二度と誰の目にも触れなくなる。
//
// 中身はホームとまったく同じ PollCard を使う。
// 一覧から来た人が、ホームで見たときと違う操作を覚え直さなくて済むようにする。
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const polls = await loadPolls(supabase, { pollId: id, voterKey: null });
  const poll = polls[0];
  if (!poll) return { title: "二択" };

  return {
    title: poll.question,
    description:
      poll.blurb ||
      `${poll.option_a} と ${poll.option_b}。昭和43年度生まれを中心にした二択です。`,
  };
}

export default async function PollDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const voterKey = await peekVoterKey();
  const polls = await loadPolls(supabase, { pollId: id, voterKey });
  const poll = polls[0];

  if (!poll) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <p className="text-sm">
        <Link
          href="/polls"
          className="no-underline hover:underline text-foreground/70"
        >
          ← これまでの二択
        </Link>
      </p>

      <PollCard
        poll={poll}
        eyebrow="二択"
        canAttachPhoto={user !== null}
        // 広告はこのページに着地する。答えたその場で誘えないと、
        // 一覧の下まで下がらない人には席の話が一度も届かない
        showSeatInvite={user === null}
        foundingOpen={isFoundingWindow()}
        returnPath={`/polls/${poll.id}`}
      />

      {/* まだ答えていない人向け。答えた人にはカードの中で誘っているので、
          ここは「読むだけでも構わない」と伝えるだけの静かな置き方にする */}
      {!user && (
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-center">
          <p className="text-base leading-8">
            ここまで、登録なしで答えられています。
            <br />
            書いてみたくなったら、そのとき席をつくれば大丈夫です。
          </p>
          <Link
            href={`/join?next=${encodeURIComponent(`/polls/${poll.id}`)}`}
            className="mt-4 inline-flex items-center justify-center min-h-[52px] px-8 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
          >
            30秒で席をつくる
          </Link>
        </div>
      )}

      <p className="text-center">
        <Link
          href="/polls"
          className="text-base no-underline hover:underline text-foreground/70"
        >
          ほかの二択も見る
        </Link>
      </p>
    </div>
  );
}
