import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import {
  canView,
  canPost,
  canAccessLounge,
  type Tier,
} from "@/lib/auth/permissions";
import { fetchAllCategories } from "@/lib/cached-categories";

export const metadata: Metadata = {
  title: "ひろば",
};

type ThreadPreview = {
  category_id: number;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
};

const TIER_TITLES: Record<Tier, string> = {
  A: "どなたでも",
  B: "会員から閲覧、認証済から投稿",
  C: "1968 認証済のみ",
  D: "1968 認証済・入会3ヶ月以上",
  L: "限定ラウンジ",
};

// カテゴリ別アイコンと色
const CATEGORY_LOOKS: Record<
  string,
  { emoji: string; bg: string; ring: string }
> = {
  "nostalgia-anime": { emoji: "🎬", bg: "#fde9d3", ring: "#a85a25" },
  "nostalgia-music": { emoji: "🎤", bg: "#f3d6db", ring: "#a83d52" },
  "nostalgia-tv": { emoji: "📺", bg: "#dde6f3", ring: "#3d5d92" },
  "nostalgia-snacks": { emoji: "🍬", bg: "#f3e3c0", ring: "#8b6f3d" },
  "nostalgia-play": { emoji: "🪁", bg: "#d8ead4", ring: "#3d6b4a" },
  "nostalgia-words": { emoji: "💬", bg: "#e7dfef", ring: "#5b3d8b" },
  "nostalgia-school": { emoji: "🎒", bg: "#dee9d9", ring: "#4a7050" },
  "bubble-era": { emoji: "🥂", bg: "#f1ddc0", ring: "#9c6a2c" },
  "living-health": { emoji: "🌿", bg: "#dceadc", ring: "#3a6e4d" },
  family: { emoji: "🏠", bg: "#f0e7d4", ring: "#8b6f3d" },
  "work-money-retirement": { emoji: "💴", bg: "#e8e0c8", ring: "#7a5d2a" },
  meetups: { emoji: "🍻", bg: "#f0d9c0", ring: "#a3622a" },
  "founding-lounge": { emoji: "🎖", bg: "#fff7e6", ring: "#c8a25e" },
  "supporters-lounge": { emoji: "🌸", bg: "#fdebe8", ring: "#a8463b" },
};

const DEFAULT_LOOK = { emoji: "📌", bg: "#e8e3d6", ring: "#8b7d56" };

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

function bodyPreview(body: string, max = 56): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max) + "…" : oneLine;
}

export default async function BoardPage() {
  const supabase = await createSupabaseServerClient();
  const { rank, isAdmin, isFoundingMember, isCurrentSupporter } =
    await getCurrentRank(supabase);

  // categories はキャッシュ済み（5 分）、毎回 Supabase に問い合わせない
  const [all, threadsRes] = await Promise.all([
    fetchAllCategories(),
    supabase
      .from("threads")
      .select("category_id, title, body, created_at, reply_count")
      .order("created_at", { ascending: false }),
  ]);
  const threads = (threadsRes.data ?? []) as ThreadPreview[];

  const latestByCat = new Map<number, ThreadPreview>();
  const countByCat = new Map<number, number>();
  for (const t of threads) {
    if (!latestByCat.has(t.category_id)) latestByCat.set(t.category_id, t);
    countByCat.set(t.category_id, (countByCat.get(t.category_id) ?? 0) + 1);
  }

  const byTier = new Map<Tier, typeof all>();
  for (const c of all) {
    const list = byTier.get(c.tier) ?? [];
    list.push(c);
    byTier.set(c.tier, list);
  }

  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-6 sm:py-10">
      <header className="px-4 sm:px-0">
        <h1 className="text-2xl font-bold">ひろば</h1>
        <p className="mt-2 text-sm text-foreground/80">
          12 のカテゴリで、同い年の方々と語り合えます。
          {rank === "guest" &&
            "今は 4 カテゴリをご覧いただけます。会員登録で 8 カテゴリに広がります。"}
          {rank === "member" &&
            "8 カテゴリを閲覧、段階A に投稿できます。1968 認証で全カテゴリが解放されます。"}
          {rank === "verified" && "全カテゴリを自由に語れます。"}
        </p>
      </header>

      {(["A", "B", "C", "D", "L"] as Tier[]).map((tier) => {
        const list = byTier.get(tier) ?? [];
        if (list.length === 0) return null;
        // ラウンジセクションは、自分にアクセス権がある場合のみ目立たせる
        const isLounge = tier === "L";
        const visibleLoungeList = isLounge
          ? list.filter((c) =>
              canAccessLounge({
                isAdmin,
                isFoundingMember,
                isCurrentSupporter,
                requiresFounding: c.requires_founding,
                requiresSupporter: c.requires_supporter,
              }),
            )
          : list;
        // ラウンジで自分が一つも入れない場合はセクションごと非表示にする
        if (isLounge && visibleLoungeList.length === 0) return null;
        const renderList = isLounge ? visibleLoungeList : list;
        return (
          <section key={tier} className="mt-8">
            <div className="px-4 sm:px-0 flex items-baseline gap-3">
              <h2 className="text-base font-bold">
                {isLounge ? "限定ラウンジ" : `段階${tier}`}
              </h2>
              <span className="text-xs text-foreground/60">
                {TIER_TITLES[tier]}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-border border-y border-border bg-background sm:rounded-xl sm:border">
              {renderList.map((c) => {
                // ラウンジは canView/canPost ではなく canAccessLounge で判定
                const viewable = isLounge
                  ? canAccessLounge({
                      isAdmin,
                      isFoundingMember,
                      isCurrentSupporter,
                      requiresFounding: c.requires_founding,
                      requiresSupporter: c.requires_supporter,
                    })
                  : canView(rank, c.access_level_view);
                const postable = isLounge
                  ? viewable
                  : canPost(rank, c.access_level_post);
                const latest = latestByCat.get(c.id);
                const total = countByCat.get(c.id) ?? 0;
                const look = CATEGORY_LOOKS[c.slug] ?? DEFAULT_LOOK;
                return (
                  <li key={c.id}>
                    {viewable ? (
                      <Link
                        href={`/board/${c.slug}`}
                        className="flex items-start gap-3 px-4 py-3.5 no-underline hover:bg-muted/40 active:bg-muted/70 transition-colors"
                      >
                        <Avatar emoji={look.emoji} bg={look.bg} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-bold text-foreground truncate">
                              {c.name}
                            </p>
                            {latest && (
                              <span className="text-xs text-foreground/60 shrink-0">
                                {formatRelative(latest.created_at)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-foreground/70 line-clamp-1">
                            {latest
                              ? `${latest.title}、${bodyPreview(latest.body, 40)}`
                              : (c.description ??
                                "まだ投稿はありません、最初の一言、書いてみませんか")}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-foreground/60">
                            <span className="inline-flex items-center gap-1">
                              <i
                                className="ri-message-2-line"
                                aria-hidden
                              />
                              {total}件
                            </span>
                            {!postable && (
                              <span className="inline-flex items-center gap-1 text-foreground/50">
                                <i className="ri-eye-line" aria-hidden />
                                閲覧のみ
                              </span>
                            )}
                            {postable && c.posting_limit_per_day && (
                              <span className="text-foreground/50">
                                1日{c.posting_limit_per_day}件まで投稿可
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div
                        className="flex items-start gap-3 px-4 py-3.5 opacity-60 cursor-not-allowed"
                        aria-disabled="true"
                      >
                        <Avatar emoji="🔒" bg="#e8e3d6" muted />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground/70 truncate">
                            {c.name}
                          </p>
                          <p className="mt-0.5 text-sm text-foreground/60 line-clamp-1">
                            {rank === "guest"
                              ? "会員登録するとご覧いただけます"
                              : "1968 認証でご覧いただけます"}
                          </p>
                        </div>
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
        <div className="mt-10 px-4 sm:px-0 text-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white no-underline font-medium hover:opacity-90"
          >
            会員登録（無料）でもっと見る
          </Link>
        </div>
      )}
    </div>
  );
}

function Avatar({
  emoji,
  bg,
  muted,
}: {
  emoji: string;
  bg: string;
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden
      className="shrink-0 inline-flex items-center justify-center size-12 rounded-full text-2xl leading-none"
      style={{
        backgroundColor: bg,
        opacity: muted ? 0.6 : 1,
      }}
    >
      {emoji}
    </span>
  );
}
