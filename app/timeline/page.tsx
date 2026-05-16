import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAuthorInfo } from "@/lib/author-info";
import { EmptyState } from "@/components/empty-state";
import { MembershipBadge } from "@/components/membership-badge";
import { ThreadThumbnail } from "@/components/thread-thumbnail";
import type { Tier } from "@/lib/auth/permissions";
import type { MediaItem } from "@/lib/media";

export const metadata: Metadata = {
  title: "みんなの新着",
  description: "1968 全カテゴリの新しい投稿を時系列でご覧いただけます",
};

const PAGE_SIZE = 30;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
  like_count: number;
  user_id: string;
  media: MediaItem[] | null;
  categories: {
    slug: string;
    name: string;
    tier: Tier;
    icon: string | null;
  } | null;
};

const TIER_BADGE: Record<Tier, string> = {
  A: "bg-muted text-foreground/70 border-border",
  B: "bg-accent/15 text-accent border-accent/30",
  C: "bg-primary/15 text-primary border-primary/30",
  D: "bg-primary text-white border-primary",
  L: "bg-amber-50 text-amber-900 border-amber-300",
};

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
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function preview(body: string, max = 100): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max) + "…" : oneLine;
}

export default async function TimelinePage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createSupabaseServerClient();

  const { data, count } = await supabase
    .from("threads")
    .select(
      "id, title, body, created_at, reply_count, like_count, user_id, media, categories(slug, name, tier, icon)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = (data ?? []) as unknown as ThreadRow[];

  const authorMap = await fetchAuthorInfo(
    supabase,
    rows.map((r) => r.user_id),
  );

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-6 sm:py-10">
      <header className="px-4 sm:px-0">
        <h1 className="text-2xl font-bold">みんなの新着</h1>
        <p className="mt-2 text-sm text-foreground/80">
          全 12 カテゴリの新しいスレッドを、新着順でご覧いただけます。
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          variant="threads"
          title="まだ投稿はありません"
          description="最初の一歩を書いてみませんか。"
        >
          <Link
            href="/board"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-medium no-underline active:opacity-90"
          >
            掲示板へ →
          </Link>
        </EmptyState>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border bg-background sm:rounded-xl sm:border">
          {rows.map((t) => {
            const author = authorMap.get(t.user_id);
            const nickname = author?.nickname ?? "（匿名）";
            const tier = (t.categories?.tier ?? "A") as Tier;
            return (
              <li key={t.id}>
                <Link
                  href={`/board/${t.categories?.slug}/${t.id}`}
                  className="flex items-start gap-3 px-4 py-4 no-underline hover:bg-muted/40 active:bg-muted/70 transition-colors"
                >
                  <ThreadThumbnail
                    media={t.media}
                    categorySlug={t.categories?.slug}
                    categoryIcon={t.categories?.icon}
                    size={72}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-px rounded border ${TIER_BADGE[tier]}`}
                      >
                        段階{tier}
                      </span>
                      <span className="text-xs text-foreground/60 truncate">
                        {t.categories?.name}
                      </span>
                      <span className="ml-auto text-xs text-foreground/50 shrink-0">
                        {formatRelative(t.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-1 font-bold text-foreground leading-snug line-clamp-1">
                      {t.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-foreground/70 line-clamp-1 leading-6">
                      {preview(t.body)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-foreground/60 flex-wrap">
                      <span className="truncate max-w-[8em]">{nickname}</span>
                      <MembershipBadge
                        rank="member"
                        compact
                        isAi={author?.isAi}
                        isFoundingMember={author?.isFoundingMember}
                        isCurrentSupporter={author?.isCurrentSupporter}
                      />
                      <span className="ml-auto inline-flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-0.5">
                          <i className="ri-message-2-line" aria-hidden />
                          {t.reply_count}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <i className="ri-heart-line" aria-hidden />
                          {t.like_count}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 px-4 sm:px-0 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/timeline?page=${page - 1}`}
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border no-underline"
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
              href={`/timeline?page=${page + 1}`}
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border no-underline"
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
