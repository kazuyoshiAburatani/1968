import Link from "next/link";
import { FOUNDING_LABEL } from "@/lib/launch";

// 席をつくる、への誘い。
//
// なぜ要るか。
// 広告を回して分かったこと（2026-08-13 時点）。着地した人の 3 割が二択に答え、
// 一言まで書いてくれる人もいるのに、席をつくった人はほぼゼロだった。
// 答えるのも書くのも登録なしでできる作りにしてある（これ自体は正しい）ので、
// いちばん温まった瞬間に、席をつくる理由がどこにも書いていなかった。
//
// なぜモーダルにしないか。
// 「投票直後に会員登録のモーダルを被せる」は仕様で禁止している。
// 結局これが目的か、と読まれて信頼が一度で崩れる。
// ここは、答えたすぐ下に静かに置くだけにしてある。閉じる操作も要らない。
//
// 書き方の決まり。
//  ・見返りを先に書く。「登録してください」から始めない
//  ・逃げ道を必ず残す。「あとからでも大丈夫」を消さない
//  ・締切は事実だけを書く。煽らない
//  ・約束したことは守る。「運営が必ず返事をします」と書く以上、
//    /admin/replies を毎日空にする運用が要る（運営の型 1）
type Props = {
  /** 席をつくったあとに戻ってくる場所 */
  next: string;
  /** いま席をつくると創設メンバーになるか。サーバ側で判定して渡す */
  foundingOpen: boolean;
  /** 一言を書いたあとか。書いた人には、その続きとして誘う */
  wrote?: boolean;
  className?: string;
};

export function SeatInvite({
  next,
  foundingOpen,
  wrote = false,
  className = "",
}: Props) {
  return (
    <div
      className={
        "rounded-xl border border-border/70 bg-background px-4 py-3.5 " +
        className
      }
    >
      {wrote && (
        <p className="text-sm font-bold leading-7 text-primary">
          一言、ありがとうございます。
        </p>
      )}

      <p className={"text-base leading-8" + (wrote ? " mt-1" : "")}>
        席をつくると、お題のほうでも書けるようになります。
        書いたものには、運営が必ず返事をします。
      </p>

      {foundingOpen && (
        <p className="mt-1.5 text-sm leading-7 text-accent font-bold">
          {FOUNDING_LABEL}までに席をつくった方は、創設メンバーになります。
        </p>
      )}

      <Link
        href={`/join?next=${encodeURIComponent(next)}`}
        className="mt-3 inline-flex items-center justify-center min-h-[52px] px-8 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
      >
        30秒で席をつくる
      </Link>

      <p className="mt-2 text-xs leading-6 text-foreground/60">
        ニックネームと生まれた日だけ。メールもパスワードも要りません。
        いまのままでも読めますし、あとからでも大丈夫です。
      </p>
    </div>
  );
}
