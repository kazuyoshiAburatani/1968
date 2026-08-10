import type { Metadata } from "next";
import Link from "next/link";
import { schoolYearLabel, cohortNote } from "@/lib/school-year";

export const metadata: Metadata = {
  title: "席ができました",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ sy?: string }>;
};

// 登録直後の一枚。
// ここで「まず何をすればいいか」を 1 つに絞るのが肝で、
// 検証では選択肢を並べるほど何もせずに閉じる確率が上がった。
// 最初の行動は必ず二択投票（1 タップで終わり、必ず結果が返ってくる）にする。
export default async function JoinDonePage({ searchParams }: Props) {
  const params = await searchParams;
  const sy = Number(params.sy);
  const label = Number.isFinite(sy) ? schoolYearLabel(sy) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <i className="ri-check-line text-3xl text-primary" aria-hidden />
      </div>

      <h1 className="mt-5 text-2xl sm:text-3xl font-bold leading-snug">
        席ができました
      </h1>

      {label && (
        <p className="mt-3 text-base leading-8 text-foreground/80">
          あなたは{label}。
          <br />
          {cohortNote(sy)}
        </p>
      )}

      <p className="mt-4 text-base leading-8 text-foreground/80">
        まずは、今日の二択から。
        <br />
        指一本で終わります。
      </p>

      <Link
        href="/#polls"
        className="mt-6 inline-flex items-center justify-center min-h-[52px] px-8 rounded-full bg-primary text-white text-base font-bold no-underline hover:opacity-90"
      >
        今日の二択を見る
      </Link>

      <div className="mt-10 rounded-2xl border border-border/60 bg-muted/40 p-5 text-left">
        <p className="text-sm font-bold">機種変更に備えるなら</p>
        <p className="mt-1.5 text-sm leading-7 text-foreground/70">
          今の状態だと、この端末のブラウザを消すと席に戻れなくなります。
          マイページからメールアドレスを 1 つ登録しておくと、
          機種を変えても同じ席に戻れます。あとからで構いません。
        </p>
        <Link
          href="/mypage"
          className="mt-3 inline-flex items-center text-sm font-medium"
        >
          マイページを開く →
        </Link>
      </div>
    </div>
  );
}
