import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enso } from "@/components/illustrations/enso";
import { WashiTexture } from "@/components/illustrations/washi-texture";
import type { Tier } from "@/lib/auth/permissions";

// 未ログインのランディング。
// ・段階A 4 カテゴリは通常表示、B〜D の 8 カテゴリはグレーアウト
// ・課金訴求を控えめに、主 CTA は「会員登録」と「掲示板をのぞく」

type Category = {
  slug: string;
  name: string;
  description: string | null;
  tier: Tier;
  display_order: number;
};

export async function HomeGuest() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("slug, name, description, tier, display_order")
    .order("display_order");
  const all = (data ?? []) as Category[];
  const openCats = all.filter((c) => c.tier === "A");
  const lockedCats = all.filter((c) => c.tier !== "A");

  return (
    <>
      {/* ヒーロー */}
      <section className="relative min-h-[60vh] flex items-center justify-center px-4 py-16 overflow-hidden">
        <WashiTexture className="absolute inset-0 w-full h-full opacity-50 text-accent" />
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
            1968年（昭和43年）生まれだけが集まる、同い年のコミュニティ。
            <br />
            介護、夫婦、健康、お金。同じ時代を生きた者同士だから、本音で語り合える。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/board"
              className="inline-flex items-center justify-center bg-primary text-white px-10 py-4 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity min-h-[56px] min-w-[240px] no-underline"
            >
              掲示板をのぞいてみる →
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center border border-primary text-primary bg-background px-10 py-4 rounded-lg text-lg font-medium hover:bg-muted transition-colors min-h-[56px] min-w-[240px] no-underline"
            >
              会員登録（無料）
            </Link>
          </div>
          <p className="mt-4 text-sm text-foreground/60">
            4 カテゴリは未登録でもご覧いただけます
          </p>
        </div>
      </section>

      {/* カテゴリ一覧、A は通常、B〜D はグレーアウト */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3 text-primary leading-[1.4]">
            12 のカテゴリ
          </h2>
          <p className="text-center text-foreground/70 mb-10 text-sm">
            同い年だからこそ話せる、12 のテーマ
          </p>

          <h3 className="text-lg font-bold mb-4 text-foreground">
            どなたでもご覧いただけます
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2 mb-10">
            {openCats.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/board/${c.slug}`}
                  className="block h-full bg-muted border border-border rounded-lg p-5 no-underline hover:shadow-md transition-shadow"
                >
                  <h4 className="font-bold text-lg text-primary">{c.name}</h4>
                  {c.description && (
                    <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-bold mb-4 text-foreground/60">
            会員登録で広がるテーマ
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 opacity-60">
            {lockedCats.map((c) => (
              <li
                key={c.slug}
                className="bg-muted/50 border border-border rounded-lg p-4 cursor-not-allowed"
                aria-disabled="true"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{c.name}</h4>
                  <span
                    aria-hidden
                    className="text-foreground/40 shrink-0"
                    title="会員登録で閲覧可"
                  >
                    <i className="ri-lock-line text-base" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm">
            <Link href="/register" className="font-medium">
              会員登録（無料）するとこちらも読めます
            </Link>
          </p>
        </div>
      </section>

      {/* 特徴、控えめに */}
      <section className="py-16 px-4 bg-muted/40">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-3 text-primary leading-[1.4]">
              同い年だけの安心感
            </h3>
            <p className="text-sm leading-[1.75]">
              1968 年生まれだけが参加できるからこそ生まれる、特別な絆と理解。
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold mb-3 text-primary leading-[1.4]">
              本音で話せる 12 のカテゴリ
            </h3>
            <p className="text-sm leading-[1.75]">
              夫婦、親の介護、健康、お金。同世代同士だから、踏み込んで話せる。
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold mb-3 text-primary leading-[1.4]">
              落ち着いた運営
            </h3>
            <p className="text-sm leading-[1.75]">
              派手な演出はなし。大人の品格を保った、質の高い語らいを維持します。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
