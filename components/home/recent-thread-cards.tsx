import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAuthorInfo } from "@/lib/author-info";
import { UserAvatar } from "@/components/user-avatar";
import type { Tier } from "@/lib/auth/permissions";

// 最新スレッドを LINE トーク一覧風のチャットカードで表示する。
// /board/[slug] の見せ方と同じで、一目でカテゴリと作者と話題が分かる。

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
  like_count: number;
  user_id: string;
  categories: { slug: string; name: string; tier: Tier } | null;
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
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export async function RecentThreadCards({ limit = 8 }: { limit?: number }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("threads")
    .select(
      "id, title, body, created_at, reply_count, like_count, user_id, categories(slug, name, tier)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as ThreadRow[];

  if (rows.length === 0) {
    return (
      <p className="py-6 text-sm text-foreground/60 text-center">
        まだ投稿がありません。最初の一歩を書いてみませんか？
      </p>
    );
  }

  const authorMap = await fetchAuthorInfo(
    supabase,
    rows.map((r) => r.user_id),
  );

  return (
    <ul className="divide-y divide-border bg-background sm:rounded-xl border-y border-border sm:border">
      {rows.map((t) => {
        const author = authorMap.get(t.user_id);
        const nickname = author?.nickname ?? "（匿名）";
        const isAi = author?.isAi === true;
        const avatarUrl = author?.avatarUrl ?? null;
        const excerpt = t.body.replace(/\s+/g, " ").trim().slice(0, 60);
        return (
          <li key={t.id}>
            <Link
              href={`/board/${t.categories?.slug}/${t.id}`}
              className="flex items-start gap-3 px-4 py-3.5 no-underline hover:bg-muted/40 active:bg-muted/70 transition-colors"
            >
              <UserAvatar
                name={nickname}
                avatarUrl={avatarUrl}
                isAi={isAi}
                size={44}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-bold text-sm truncate flex items-center gap-1.5">
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
                <p className="mt-0.5 text-xs text-foreground/60 truncate">
                  {t.categories?.name}
                </p>
                <p className="mt-0.5 font-medium text-sm text-foreground line-clamp-1">
                  {t.title}
                </p>
                <p className="mt-0.5 text-sm text-foreground/70 line-clamp-1">
                  {excerpt}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-foreground/60">
                  <span className="inline-flex items-center gap-1">
                    <i className="ri-message-2-line" aria-hidden />
                    {t.reply_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="ri-heart-line" aria-hidden />
                    {t.like_count}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
