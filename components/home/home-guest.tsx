import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enso } from "@/components/illustrations/enso";
import { WashiTexture } from "@/components/illustrations/washi-texture";

// 未ログイン／ゲスト向けのランディング。
// 掲示板 TOP への大ボタンを最上段、ピックアップ 4 カテゴリ、入会2ボタン、特徴3枚。

const PICKUP_SLUGS = [
  "showa43-memories",
  "youth-bubble-era",
  "parents-care",
  "health",
] as const;

type PickupCategory = {
  slug: string;
  name: string;
  description: string | null;
  tier: "A" | "B" | "C" | "D";
};

export async function HomeGuest() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("slug, name, description, tier, display_order")
    .in("slug", PICKUP_SLUGS as unknown as string[])
    .order("display_order");
  const pickup = (data ?? []) as PickupCategory[];

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* ヒーロー */}
      <section className="relative py-14 md:py-20 text-center overflow-hidden">
        <WashiTexture className="absolute inset-0 -z-10 text-accent" />
        <div className="absolute top-4 right-4 md:top-8 md:right-10 text-primary/20">
          <Enso size={140} />
        </div>

        <p className="text-sm tracking-widest text-accent">
          SHOWA 43 / 1968 ONLY
        </p>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">
          昭和43年生まれだけの、
          <br className="md:hidden" />
          語らいの場。
        </h1>
        <p className="mt-6 text-base md:text-lg text-foreground/80">
          1968年（昭和43年）生まれだけが参加できる会員制コミュニティ。
          <br className="hidden md:inline" />
          介護、夫婦、健康、お金。人には聞きにくい話題も、同い年となら本音で話せる。
        </p>
        <div className="mt-10">
          <Link
            href="/board"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-10 py-4 rounded-full bg-primary text-white text-lg md:text-xl font-bold no-underline hover:opacity-90 shadow-lg"
          >
            掲示板をのぞいてみる →
          </Link>
          <p className="mt-3 text-sm text-foreground/60">
            未登録でも一部のカテゴリと投稿をご覧いただけます
          </p>
        </div>
      </section>

      {/* ピックアップカテゴリ */}
      {pickup.length > 0 && (
        <section className="py-6">
          <h2 className="text-xl font-bold text-center">今月のピックアップ</h2>
          <p className="mt-2 text-center text-sm text-foreground/70">
            同い年だからこそ話せる、よく語られているテーマ
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pickup.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/board/${c.slug}`}
                  className="block h-full rounded-lg border border-border bg-background p-5 no-underline hover:bg-muted/40"
                >
                  <span
                    className={
                      "inline-block text-xs font-bold px-2 py-0.5 rounded-full " +
                      (c.tier === "A"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-white")
                    }
                  >
                    {c.tier === "A" ? "どなたでも" : "会員限定"}
                  </span>
                  <p className="mt-3 font-bold text-base">{c.name}</p>
                  {c.description && (
                    <p className="mt-1 text-sm text-foreground/70 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 入会 2 ボタン */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center">入会する</h2>
        <p className="mt-2 text-center text-sm text-foreground/70">
          いずれもマイページからいつでも解約できます
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PlanCtaCard
            name="準会員"
            price="月額 180円"
            yearly="年額 1,800円（2ヶ月分お得）"
            bullets={[
              "段階A・Bカテゴリの閲覧",
              "段階Aカテゴリへの投稿（1日3件まで）",
              "メアドとクレジットカードで登録",
            ]}
            href="/register?plan=associate"
            cta="準会員に入会する"
          />
          <PlanCtaCard
            name="正会員"
            price="月額 480円"
            yearly="年額 4,800円（2ヶ月分お得）"
            bullets={[
              "全12カテゴリの閲覧・投稿",
              "メッセージ・オフ会の参加",
              "身分証による「本人確認済」バッジ",
            ]}
            href="/register?plan=regular"
            cta="正会員に入会する"
            highlighted
          />
        </div>
      </section>

      {/* 特徴 */}
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
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-border bg-background p-6">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="mt-2 text-foreground/80">{body}</p>
    </article>
  );
}

function PlanCtaCard({
  name,
  price,
  yearly,
  bullets,
  href,
  cta,
  highlighted,
}: {
  name: string;
  price: string;
  yearly: string;
  bullets: string[];
  href: string;
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <article
      className={
        "rounded-xl border p-6 flex flex-col " +
        (highlighted ? "border-primary bg-muted/40" : "border-border bg-background")
      }
    >
      <h3 className="font-bold text-xl">{name}</h3>
      <p className="mt-2 text-2xl font-bold text-primary">{price}</p>
      <p className="text-sm text-foreground/70">{yearly}</p>
      <ul className="mt-4 space-y-2 text-sm flex-1">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span aria-hidden>・</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={
          "mt-6 inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full font-medium no-underline hover:opacity-90 " +
          (highlighted
            ? "bg-primary text-white"
            : "border border-primary text-primary bg-background")
        }
      >
        {cta}
      </Link>
    </article>
  );
}
