import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import { canView, canPost, type Tier, type ViewLevel, type PostLevel } from "@/lib/auth/permissions";
import { fetchAuthorInfo } from "@/lib/author-info";
import { UserAvatar } from "@/components/user-avatar";

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
          <Link href="/board">← 掲示板一覧</Link>
        </nav>
        <h1 className="text-2xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-foreground/80">
            {category.description}
          </p>
        )}
        <div className="mt-8 rounded-lg border border-border bg-muted/40 p-6 text-sm">
          <p className="font-bold">このカテゴリは会員限定です。</p>
          <p className="mt-2 text-foreground/80">
            {category.access_level_view === "member"
              ? "会員登録すればご覧いただけます。"
              : "正会員でご覧いただけます。"}
          </p>
          <p className="mt-6">
            <Link
              href={rank === "guest" ? "/register" : "/mypage"}
              className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-medium no-underline hover:opacity-90"
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

  // 作者ニックネーム＋ランク＋AI 判定をまとめて取得
  const authorMap = await fetchAuthorInfo(
    supabase,
    threadRows.map((t) => t.user_id),
  );

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canPostHere = canPost(rank, category.access_level_post);

  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-4 sm:py-8 pb-24 sm:pb-32">
      {/* スティッキーヘッダー、戻るボタンとカテゴリ名 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 sm:rounded-t-xl sm:border sm:border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/board"
            aria-label="ひろばへ戻る"
            className="text-foreground/70 hover:text-foreground active:bg-muted -mx-1 px-1 py-1 rounded"
          >
            <i className="ri-arrow-left-line text-xl" aria-hidden />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{category.name}</h1>
            {category.description && (
              <p className="text-xs text-foreground/60 line-clamp-1">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </header>

      {threadRows.length === 0 ? (
        <div className="mt-12 px-4 text-center text-foreground/70">
          <p>まだスレッドはありません。</p>
          {canPostHere && (
            <p className="mt-2 text-sm">最初の一歩を書いてみませんか？</p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border bg-background sm:rounded-b-xl sm:border-x sm:border-b sm:border-border">
          {threadRows.map((t) => {
            const author = authorMap.get(t.user_id);
            const nickname = author?.nickname ?? "（匿名）";
            const isAi = author?.isAi === true;
            const avatarUrl = author?.avatarUrl ?? null;
            const excerpt = t.body.replace(/\s+/g, " ").trim().slice(0, 70);
            return (
              <li key={t.id}>
                <Link
                  href={`/board/${category.slug}/${t.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 no-underline hover:bg-muted/40 active:bg-muted/70 transition-colors"
                >
                  <UserAvatar
                    name={nickname}
                    avatarUrl={avatarUrl}
                    isAi={isAi}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                        <span className="truncate">{nickname}</span>
                        {isAi && (
                          <span className="shrink-0 inline-block px-1.5 py-px rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            運営AI
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-foreground/60 shrink-0">
                        {formatRelative(t.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 font-medium text-sm text-foreground line-clamp-1">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-sm text-foreground/70 line-clamp-1">
                      {excerpt}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-foreground/60">
                      <span className="inline-flex items-center gap-1">
                        <i className="ri-message-2-line" aria-hidden />
                        {t.reply_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <i className="ri-heart-line" aria-hidden />
                        {t.like_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <i className="ri-eye-line" aria-hidden />
                        {t.view_count}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* 投稿 FAB、画面右下にフロート */}
      {canPostHere && (
        <Link
          href={`/board/${category.slug}/new`}
          aria-label="新しいスレッドを書く"
          className="fixed right-4 bottom-24 md:bottom-8 z-30 inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-primary text-white font-medium no-underline shadow-lg active:opacity-90"
        >
          <i className="ri-edit-line text-lg" aria-hidden />
          新しく書く
        </Link>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 px-4 sm:px-0 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/board/${category.slug}?page=${page - 1}`}
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border no-underline active:bg-muted"
            >
              ← 新しい投稿へ
            </Link>
          ) : (
            <span />
          )}
          <span className="text-foreground/60">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/board/${category.slug}?page=${page + 1}`}
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border no-underline active:bg-muted"
            >
              古い投稿へ →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  const d = new Date(iso);
  const today = new Date();
  if (d.getFullYear() === today.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
