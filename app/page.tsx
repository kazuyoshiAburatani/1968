import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;

  // Supabase Auth がエラー時に Site URL（ここ）にフォールバックして来るため、
  // エラーパラメータを検出したら /login に誘導してユーザーに理由を表示する。
  if (params.error) {
    const reason = params.error_code ?? params.error;
    redirect(`/login?error=${encodeURIComponent(reason)}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-16 md:py-24 text-center">
        <p className="text-sm tracking-widest text-[color:var(--color-accent)]">
          SHOWA 43 / 1968 ONLY
        </p>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">
          昭和43年生まれだけの、
          <br className="md:hidden" />
          語らいの場。
        </h1>
        <p className="mt-6 text-lg text-[color:var(--color-foreground)]/80">
          1968年（昭和43年）生まれだけが参加できる会員制コミュニティ。
          <br className="hidden md:inline" />
          介護、夫婦、健康、お金。人には聞きにくい話題も、同い年となら本音で話せる。
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] font-medium no-underline hover:opacity-90"
          >
            入会する（月額180円〜）
          </Link>
          <Link
            href="/board"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-[color:var(--color-border)] no-underline hover:bg-[color:var(--color-muted)]"
          >
            会報を覗いてみる
          </Link>
        </div>
      </section>

      <section className="py-12 grid gap-6 md:grid-cols-3">
        <FeatureCard
          title="同い年だけの安心感"
          body="参加できるのは1968年生まれだけ。世代が揃うから、前置きなしで本題に入れる。"
        />
        <FeatureCard
          title="本音で話せる12のカテゴリ"
          body="青春の思い出から、親の介護、夫婦のこと、お金の話まで。同世代同士だから踏み込める。"
        />
        <FeatureCard
          title="落ち着いた運営"
          body="派手さや若者向けの演出はなし。身分証確認で正会員を担保し、健全な語らいを守ります。"
        />
      </section>

      <section className="py-12">
        <h2 className="text-2xl font-bold text-center">会員プラン</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <PlanCard
            name="準会員"
            price="月額 180円"
            yearly="年額 1,800円（2ヶ月分お得）"
            bullets={[
              "段階A・Bカテゴリの閲覧",
              "段階Aカテゴリへの投稿（1日1件まで）",
              "クレジットカード決済",
            ]}
          />
          <PlanCard
            name="正会員"
            price="月額 480円"
            yearly="年額 4,800円（2ヶ月分お得）"
            bullets={[
              "全12カテゴリの閲覧・投稿",
              "メッセージ・オフ会の参加",
              "身分証による本人確認バッジ付与",
            ]}
            highlighted
          />
        </div>
        <p className="mt-6 text-center text-sm text-[color:var(--color-foreground)]/70">
          いずれもマイページからいつでも解約できます。
        </p>
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-6">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="mt-2 text-[color:var(--color-foreground)]/80">{body}</p>
    </article>
  );
}

function PlanCard({
  name,
  price,
  yearly,
  bullets,
  highlighted,
}: {
  name: string;
  price: string;
  yearly: string;
  bullets: string[];
  highlighted?: boolean;
}) {
  return (
    <article
      className={
        "rounded-xl border p-6 " +
        (highlighted
          ? "border-[color:var(--color-primary)] bg-[color:var(--color-muted)]/40"
          : "border-[color:var(--color-border)]")
      }
    >
      <h3 className="font-bold text-xl">{name}</h3>
      <p className="mt-2 text-2xl font-bold text-[color:var(--color-primary)]">
        {price}
      </p>
      <p className="text-sm text-[color:var(--color-foreground)]/70">
        {yearly}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span aria-hidden>・</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
