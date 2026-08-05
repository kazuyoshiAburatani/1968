import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 企画記事「あの店・あの商品、今どうなってる？」の新着。
//
// 検証で唯一、自発的な長文投稿と会員同士の返信が発生した形式。
// 効いていたのは「ただの懐古ではなく情報提供だ」という大義名分で、
// 遠慮がちな人でも「私だけが知っている現場の情報」として堂々と書けた。
export async function StoryRail() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stories")
    .select("slug, title, lead, published_at")
    .eq("is_active", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3);

  const stories = (data ?? []) as {
    slug: string;
    title: string;
    lead: string;
  }[];

  if (stories.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">
          あの店・あの商品、今どうなってる？
        </h2>
        <Link href="/stories" className="text-sm no-underline hover:underline">
          ぜんぶ見る →
        </Link>
      </div>

      <ul className="mt-3 space-y-3">
        {stories.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/stories/${s.slug}`}
              className="block rounded-2xl border border-border/60 bg-background p-5 no-underline hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-7 text-foreground/70">
                {s.lead}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
