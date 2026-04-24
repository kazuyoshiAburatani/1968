import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enso } from "@/components/illustrations/enso";
import { WashiTexture } from "@/components/illustrations/washi-texture";

// 未ログイン／ゲスト向けのランディング。Readdy デザイン準拠。
// ヒーロー（大画面）、ピックアップ4、入会2プラン（正会員に「おすすめ」バッジ）、特徴3枚。

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
    <>
      {/* ヒーローセクション */}
      <section className="relative min-h-[70vh] flex items-center justify-center px-4 py-16 overflow-hidden">
        {/* 和紙パターン背景 */}
        <WashiTexture className="absolute inset-0 w-full h-full opacity-50 text-accent" />

        {/* 円相装飾 */}
        <div className="absolute top-8 right-8 opacity-20 text-foreground pointer-events-none">
          <Enso size={120} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-sm text-accent mb-4 font-medium tracking-wider">
            SHOWA 43 / 1968 ONLY
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-[1.4]">
            昭和43年生まれだけの、
            <br className="hidden md:block" />
            語らいの場。
          </h1>
          <p className="text-lg md:text-xl mb-12 leading-[1.75] max-w-3xl mx-auto px-4">
            1968年（昭和43年）生まれだけが参加できる会員制コミュニティ。
            <br />
            介護、夫婦、健康、お金。人には聞きにくい話題も、
            <br />
            同い年となら本音で話せる。
          </p>
          <Link
            href="/board"
            className="inline-flex items-center justify-center bg-primary text-white px-12 py-4 rounded-lg text-xl font-medium hover:opacity-90 transition-opacity min-h-[56px] min-w-[280px] no-underline"
            aria-label="掲示板をのぞいてみる"
          >
            掲示板をのぞいてみる →
          </Link>
          <p className="mt-4 text-sm text-foreground/60">
            未登録でも一部のカテゴリと投稿をご覧いただけます
          </p>
        </div>
      </section>

      {/* 今月のピックアップセクション */}
      {pickup.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-primary leading-[1.4]">
              今月のピックアップ
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {pickup.map((c) => (
                <Link
                  key={c.slug}
                  href={`/board/${c.slug}`}
                  className="bg-muted border border-border rounded-lg p-6 hover:shadow-md transition-shadow no-underline block"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="text-xl font-bold text-primary leading-[1.4]">
                      {c.name}
                    </h3>
                    <span
                      className={
                        "px-3 py-1 rounded-full text-sm font-medium shrink-0 " +
                        (c.tier === "A"
                          ? "bg-accent text-white"
                          : "bg-primary text-white")
                      }
                    >
                      {c.tier === "A" ? "どなたでも" : "会員限定"}
                    </span>
                  </div>
                  <p className="text-base leading-[1.75] text-foreground/80">
                    {c.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 入会セクション */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-primary leading-[1.4]">
            入会する
          </h2>
          <p className="text-center mb-12 text-accent font-medium">
            いずれもマイページからいつでも解約できます
          </p>

          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* 準会員 */}
            <article className="bg-background border-2 border-border rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-4 text-primary leading-[1.4]">
                準会員
              </h3>
              <div className="mb-6">
                <span className="text-3xl font-bold">月額180円</span>
                <span className="text-lg text-accent ml-2">/ 年額1,800円</span>
              </div>
              <ul className="space-y-3 mb-8 text-base leading-[1.75]">
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  段階A・Bカテゴリの閲覧
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  段階Aカテゴリへの投稿（1日3件まで）
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  メールアドレスとクレジットカードで登録
                </li>
              </ul>
              <Link
                href="/register?plan=associate"
                className="block w-full text-center bg-accent text-white py-4 rounded-lg font-medium hover:opacity-90 transition-opacity min-h-[56px] no-underline"
                aria-label="準会員に入会する"
              >
                準会員に入会する
              </Link>
            </article>

            {/* 正会員（おすすめ） */}
            <article className="bg-background border-4 border-primary rounded-lg p-8 relative">
              <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                おすすめ
              </span>
              <h3 className="text-2xl font-bold mb-4 text-primary leading-[1.4]">
                正会員
              </h3>
              <div className="mb-6">
                <span className="text-3xl font-bold">月額480円</span>
                <span className="text-lg text-accent ml-2">/ 年額4,800円</span>
              </div>
              <ul className="space-y-3 mb-8 text-base leading-[1.75]">
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  全12カテゴリの閲覧・投稿
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  メッセージ・オフ会の参加
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  身分証による本人確認済バッジ
                </li>
              </ul>
              <Link
                href="/register?plan=regular"
                className="block w-full text-center bg-primary text-white py-4 rounded-lg font-medium hover:opacity-90 transition-opacity min-h-[56px] no-underline"
                aria-label="正会員に入会する"
              >
                正会員に入会する
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4 text-primary leading-[1.4]">
                同い年だけの安心感
              </h3>
              <p className="text-base leading-[1.75]">
                1968年生まれだけが参加できるからこそ生まれる、特別な絆と理解。世代を超えた議論ではなく、同じ時代を生きた仲間との深い対話。
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4 text-primary leading-[1.4]">
                本音で話せる12のカテゴリ
              </h3>
              <p className="text-base leading-[1.75]">
                夫婦関係、親の介護、健康不安、お金の悩み。人には相談しにくい話題も、同世代の仲間となら安心して語り合える。
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4 text-primary leading-[1.4]">
                落ち着いた運営
              </h3>
              <p className="text-base leading-[1.75]">
                荒らしや不適切な投稿は厳格に管理。大人の品格を保った、質の高いコミュニケーションを維持いたします。
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
