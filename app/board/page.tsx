import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import { canView, canPost, type Tier, type ViewLevel, type PostLevel } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "会報",
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
  B: "準会員から",
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
  const viewable = all.filter((c) => canView(rank, c.access_level_view));
  const locked = all.filter((c) => !canView(rank, c.access_level_view));

  // tier ごとにグルーピング
  const byTier = new Map<Tier, Category[]>();
  for (const c of viewable) {
    const list = byTier.get(c.tier) ?? [];
    list.push(c);
    byTier.set(c.tier, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold">会報</h1>
        <p className="mt-2 text-[color:var(--color-foreground)]/80">
          同い年の方々の語り合い。
          {rank === "guest" &&
            "今は体験閲覧中です、気になるカテゴリが見えたら入会をご検討ください。"}
          {rank === "pending" && "まずは一部のカテゴリをご覧いただけます。"}
          {(rank === "associate" || rank === "regular") && "お気に入りのカテゴリからどうぞ。"}
        </p>
      </header>

      {(["A", "B", "C", "D"] as Tier[]).map((tier) => {
        const list = byTier.get(tier) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={tier} className="mt-10">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold">段階{tier}</h2>
              <span className="text-sm text-[color:var(--color-foreground)]/60">
                {TIER_TITLES[tier]}
              </span>
            </div>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {list.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/board/${c.slug}`}
                    className="block rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-4 no-underline hover:bg-[color:var(--color-muted)]/40"
                  >
                    <p className="font-bold">{c.name}</p>
                    {c.description && (
                      <p className="mt-1 text-sm text-[color:var(--color-foreground)]/70">
                        {c.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[color:var(--color-foreground)]/60">
                      {canPost(rank, c.access_level_post)
                        ? c.posting_limit_per_day
                          ? `投稿可（1日${c.posting_limit_per_day}件まで）`
                          : "投稿可"
                        : "投稿権なし（閲覧のみ）"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {locked.length > 0 && (
        <section className="mt-12 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 p-6">
          <h2 className="font-bold">
            会員限定のカテゴリが{locked.length}件あります
          </h2>
          <p className="mt-2 text-sm text-[color:var(--color-foreground)]/80">
            介護・夫婦・健康・お金など、同い年だからこそ本音で話せる場は、会員限定で開かれています。
          </p>
          <ul className="mt-4 space-y-1 text-sm text-[color:var(--color-foreground)]/70">
            {locked.map((c) => (
              <li key={c.id}>・{c.name}</li>
            ))}
          </ul>
          <p className="mt-6">
            <Link
              href="/register"
              className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-[color:var(--color-primary)] text-white font-medium no-underline hover:opacity-90"
            >
              {rank === "guest" ? "新規登録する" : "マイページで課金する"}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
