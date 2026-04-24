import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import {
  canView,
  canPost,
  type Tier,
  type ViewLevel,
  type PostLevel,
} from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "掲示板",
};

type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
  tier: Tier;
  access_level_view: ViewLevel;
  access_level_post: PostLevel;
  posting_limit_per_day: number | null;
};

const TIER_TITLES: Record<Tier, string> = {
  A: "どなたでも",
  B: "会員から",
  C: "正会員のみ",
  D: "正会員・入会3ヶ月以上",
};

export default async function BoardPage() {
  const supabase = await createSupabaseServerClient();
  const { rank } = await getCurrentRank(supabase);

  const { data: categories } = await supabase
    .from("categories")
    .select(
      "id, slug, name, description, display_order, tier, access_level_view, access_level_post, posting_limit_per_day",
    )
    .order("display_order");
  const all = (categories ?? []) as Category[];

  const byTier = new Map<Tier, Category[]>();
  for (const c of all) {
    const list = byTier.get(c.tier) ?? [];
    list.push(c);
    byTier.set(c.tier, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold">掲示板</h1>
        <p className="mt-2 text-foreground/80">
          12 のカテゴリで、同い年の方々と語り合えます。
          {rank === "guest" &&
            "今は 4 カテゴリをご覧いただけます、会員登録で 8 カテゴリに広がります。"}
          {rank === "member" && "8 カテゴリを閲覧、段階A に投稿できます。"}
          {rank === "regular" && "全カテゴリを自由に語れます。"}
        </p>
      </header>

      {(["A", "B", "C", "D"] as Tier[]).map((tier) => {
        const list = byTier.get(tier) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={tier} className="mt-10">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold">段階{tier}</h2>
              <span className="text-sm text-foreground/60">
                {TIER_TITLES[tier]}
              </span>
            </div>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {list.map((c) => {
                const viewable = canView(rank, c.access_level_view);
                const postable = canPost(rank, c.access_level_post);
                return (
                  <li key={c.id}>
                    {viewable ? (
                      <Link
                        href={`/board/${c.slug}`}
                        className="block rounded-lg border border-border bg-background p-4 no-underline hover:bg-muted/40"
                      >
                        <p className="font-bold">{c.name}</p>
                        {c.description && (
                          <p className="mt-1 text-sm text-foreground/70">
                            {c.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-foreground/60">
                          {postable
                            ? c.posting_limit_per_day
                              ? `投稿可（1日${c.posting_limit_per_day}件まで）`
                              : "投稿可"
                            : "閲覧のみ"}
                        </p>
                      </Link>
                    ) : (
                      <div
                        className="rounded-lg border border-border bg-muted/40 p-4 opacity-60 cursor-not-allowed"
                        aria-disabled="true"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold">{c.name}</p>
                          <i
                            className="ri-lock-line text-foreground/50"
                            aria-hidden
                          />
                        </div>
                        {c.description && (
                          <p className="mt-1 text-sm text-foreground/60">
                            {c.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-foreground/50">
                          {rank === "guest"
                            ? "会員登録するとご覧いただけます"
                            : "正会員でご覧いただけます"}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {rank === "guest" && (
        <p className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-lg border border-primary text-primary bg-background hover:bg-muted no-underline font-medium"
          >
            会員登録（無料）でもっと見る
          </Link>
        </p>
      )}
    </div>
  );
}
