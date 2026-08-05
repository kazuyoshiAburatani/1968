import Link from "next/link";

// 年表と検定への入口。
//
// どちらも「継続」ではなく「入口」の装置として置いている。
// 検証では初回参加が 8.0 / 7.0 と高い一方、継続は 2 点台の打ち上げ花火だった。
// したがって、遊んで終わりにならないよう結果ページから必ずお題と二択へ戻す。
export function SpreadCards() {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <Card
        href="/nenpyo"
        icon="ri-time-line"
        title="あなたの1968年表"
        body="生まれた日を入れると、あなたが何年生のときに何があったかが並びます。早生まれの方も、学年で正しく出ます。"
        cta="年表をつくる"
      />
      <Card
        href="/kentei"
        icon="ri-award-line"
        title="昭和43年度生まれ検定"
        body="6問だけ。体験していないと解けない問題ばかりです。男女どちらの思い出も半分ずつ出します。"
        cta="受けてみる"
      />
    </section>
  );
}

function Card({
  href,
  icon,
  title,
  body,
  cta,
}: {
  href: string;
  icon: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border/60 bg-background p-5 no-underline hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <i className={`${icon} text-2xl text-primary`} aria-hidden />
      <h3 className="mt-2 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-7 text-foreground/70">
        {body}
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
        {cta}
        <i
          className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
