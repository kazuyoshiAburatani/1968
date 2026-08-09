import Link from "next/link";
import { FOUNDING_LABEL, isFoundingWindow } from "@/lib/launch";

// 「一緒に始める人を探しています」と正直に言う受け皿。
//
// 立ち上げ期にいちばん困るのは、来た人に見せられる中身が少ないこと。
// ここで「たくさんの仲間が待っています」と書くと、次の画面で嘘だと分かって、
// そこで終わる。検証で 6 人全員が離脱した原因の 1 番目が、
// まさにこの「過疎が見えたこと」だった。
//
// 隠せないものは、隠さずに前に出す。
// 始まったばかりであることを弱みではなく誘いとして書けば、
// 「最初の一人になってみるか」と思う人だけが残る。その人こそが要る人になる。
//
// 出す場所は、年表と検定の結果画面。
// どちらも人数に関係なく成立する画面で、しかも読み終わった直後がいちばん温まっている。
// 二択やお題の下には置かない。あちらは投稿の流れを止めたくない。
//
// 創設メンバーの受付が終わったら、自動で出なくなる。
export function FoundingCta() {
  if (!isFoundingWindow()) return null;

  return (
    <section className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-6 text-center">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
        <i className="ri-award-line text-base" aria-hidden />
        創設メンバー募集中
      </p>

      <p className="mt-2 text-lg sm:text-xl font-bold leading-snug">
        いま、この場所を
        <br className="sm:hidden" />
        一緒に始める人を探しています
      </p>

      <p className="mt-3 text-base leading-8 text-foreground/80">
        始まったばかりの場所です。
        <br />
        {FOUNDING_LABEL}までに席をつくった方には、
        <br className="sm:hidden" />
        名前の横に「創設メンバー」が付きます。
      </p>

      <Link
        href="/join"
        className="mt-4 inline-flex items-center justify-center min-h-[52px] px-8 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
      >
        30秒で席をつくる
      </Link>

      <p className="mt-2 text-xs leading-6 text-foreground/60">
        ニックネームと生まれた日だけ。メールアドレスもパスワードも要りません。
        <br />
        書いたものは、あとから自分で消せます。
      </p>
    </section>
  );
}
