import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import { canView, canPost, type Tier, type ViewLevel, type PostLevel } from "@/lib/auth/permissions";

const PAGE_SIZE = 20;

type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  tier: Tier;
  access_level_view: ViewLevel;
  access_level_post: PostLevel;
  posting_limit_per_day: number | null;
};

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
  like_count: number;
  view_count: number;
  user_id: string;
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: category } = await supabase
    .from("categories")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  return { title: category?.name ?? "カテゴリ" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const supabase = await createSupabaseServerClient();
  const { rank } = await getCurrentRank(supabase);

  const { data: category } = await supabase
    .from("categories")
    .select(
      "id, slug, name, description, tier, access_level_view, access_level_post, posting_limit_per_day",
    )
    .eq("slug", slug)
    .maybeSingle<Category>();

  if (!category) {
    notFound();
  }

  const canViewThis = canView(rank, category.access_level_view);

  // ランクで閲覧不可のカテゴリは、存在を伝えつつ入会誘導
  if (!canViewThis) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <nav className="mb-4 text-sm">
          <Link href="/board">← 会報一覧</Link>
        </nav>
        <h1 className="text-2xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-[color:var(--color-foreground)]/80">
            {category.description}
          </p>
        )}
        <div className="mt-8 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 p-6 text-sm">
          <p className="font-bold">このカテゴリは会員限定です。</p>
          <p className="mt-2 text-[color:var(--color-foreground)]/80">
            {category.access_level_view === "associate"
              ? "準会員以上の方にご覧いただけます。"
              : "正会員の方にご覧いただけます。"}
          </p>
          <p className="mt-6">
            <Link
              href={rank === "guest" ? "/register" : "/mypage"}
              className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-[color:var(--color-primary)] text-white font-medium no-underline hover:opacity-90"
            >
              {rank === "guest" ? "新規登録する" : "マイページへ"}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: threads, count } = await supabase
    .from("threads")
    .select(
      "id, title, body, created_at, reply_count, like_count, view_count, user_id",
      { count: "exact" },
    )
    .eq("category_id", category.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const threadRows = (threads ?? []) as ThreadRow[];

  // 作者ニックネームをバッチ取得（bio_visible により取得不可のプロフィールは undefined）
  const authorIds = [...new Set(threadRows.map((t) => t.user_id))];
  const authorMap = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname")
      .in("user_id", authorIds);
    for (const p of profiles ?? []) {
      authorMap.set(p.user_id as string, p.nickname as string);
    }
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canPostHere = canPost(rank, category.access_level_post);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-4 text-sm">
        <Link href="/board">← 会報一覧</Link>
      </nav>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          {category.description && (
            <p className="mt-1 text-[color:var(--color-foreground)]/80">
              {category.description}
            </p>
          )}
        </div>
        {canPostHere && (
          <Link
            href={`/board/${category.slug}/new`}
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-[color:var(--color-primary)] text-white font-medium no-underline hover:opacity-90"
          >
            新しいスレッドを書く
          </Link>
        )}
      </header>

      {threadRows.length === 0 ? (
        <div className="mt-12 text-center text-[color:var(--color-foreground)]/70">
          まだスレッドはありません。
          {canPostHere && "最初の一歩を書いてみませんか？"}
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-[color:var(--color-border)]">
          {threadRows.map((t) => {
            const nickname = authorMap.get(t.user_id) ?? "（匿名）";
            const excerpt = t.body.slice(0, 80);
            return (
              <li key={t.id} className="py-4">
                <Link
                  href={`/board/${category.slug}/${t.id}`}
                  className="block no-underline hover:bg-[color:var(--color-muted)]/40 -mx-2 px-2 py-1 rounded"
                >
                  <p className="font-bold text-base">{t.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--color-foreground)]/70 line-clamp-2">
                    {excerpt}
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--color-foreground)]/60">
                    {nickname} ・ {new Date(t.created_at).toLocaleDateString("ja-JP")} ・
                    返信{t.reply_count} ・ いいね{t.like_count}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/board/${category.slug}?page=${page - 1}`}
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-[color:var(--color-border)] no-underline"
            >
              ← 前のページ
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[color:var(--color-foreground)]/60">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/board/${category.slug}?page=${page + 1}`}
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-[color:var(--color-border)] no-underline"
            >
              次のページ →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
