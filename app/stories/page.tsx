import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "あの店・あの商品、今どうなってる？",
  description:
    "給食のソフト麺、なめ猫、駅前のレコード店。1968年前後に生まれた学年が見てきたものの、今の安否を確かめる連載です。",
};

export default async function StoriesPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stories")
    .select("slug, title, lead, published_at")
    .eq("is_active", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  const stories = (data ?? []) as {
    slug: string;
    title: string;
    lead: string;
    published_at: string;
  }[];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
          あの店・あの商品、今どうなってる？
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/80">
          懐かしがって終わりにせず、今どうなっているのかを調べています。
          記事の最後に、あなたの地元のことを書いていってください。
        </p>
      </header>

      {stories.length === 0 ? (
        <p className="text-sm text-foreground/60">
          最初の記事を準備しています。
        </p>
      ) : (
        <ul className="space-y-3">
          {stories.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/stories/${s.slug}`}
                className="block rounded-2xl border border-border/60 bg-background p-5 no-underline hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <h2 className="text-lg font-bold text-foreground leading-snug">
                  {s.title}
                </h2>
                <p className="mt-1.5 text-sm leading-7 text-foreground/70">
                  {s.lead}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
