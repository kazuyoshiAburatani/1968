import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteCategory } from "./actions";

export const metadata: Metadata = { title: "カテゴリ管理" };

type Props = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

type Row = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
  tier: "A" | "B" | "C" | "D";
  access_level_view: "guest" | "member" | "regular";
  access_level_post: "member" | "regular";
  posting_limit_per_day: number | null;
  requires_tenure_months: number;
};

const TIER_COLOR: Record<Row["tier"], string> = {
  A: "bg-muted text-foreground/70 border-border",
  B: "bg-accent/15 text-accent border-accent/30",
  C: "bg-primary/15 text-primary border-primary/30",
  D: "bg-primary text-white border-primary",
};

const VIEW_LABEL: Record<Row["access_level_view"], string> = {
  guest: "ゲスト〜",
  member: "会員〜",
  regular: "正会員のみ",
};

const POST_LABEL: Record<Row["access_level_post"], string> = {
  member: "会員〜",
  regular: "正会員のみ",
};

export default async function AdminCategoriesPage({ searchParams }: Props) {
  const { saved, error } = await searchParams;
  const sb = getSupabaseAdminClient();

  const { data: cats } = await sb
    .from("categories")
    .select(
      "id, slug, name, description, display_order, tier, access_level_view, access_level_post, posting_limit_per_day, requires_tenure_months",
    )
    .order("display_order");
  const rows = (cats ?? []) as Row[];

  // 各カテゴリのスレッド数も並行取得
  const counts = new Map<number, number>();
  if (rows.length > 0) {
    const { data: threadsByCat } = await sb
      .from("threads")
      .select("category_id");
    for (const t of threadsByCat ?? []) {
      const cid = t.category_id as number;
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">カテゴリ管理</h1>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium no-underline active:opacity-90"
        >
          <i className="ri-add-line text-base" aria-hidden />
          新しいカテゴリ
        </Link>
      </div>

      {saved && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 px-4 py-2.5 text-sm">
          保存しました。
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 text-red-900 px-4 py-2.5 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <p className="mt-3 text-sm text-foreground/70">
        現在 {rows.length} 個のカテゴリ。表示順、tier、アクセス権を変更できます。
        既存スレッドのあるカテゴリは削除できません。
      </p>

      <ul className="mt-6 space-y-3">
        {rows.map((c) => {
          const threadCount = counts.get(c.id) ?? 0;
          return (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-foreground/60">
                      #{c.display_order}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-px rounded border ${TIER_COLOR[c.tier]}`}
                    >
                      段階{c.tier}
                    </span>
                    <p className="font-bold truncate">{c.name}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/60 truncate">
                    /{c.slug}
                  </p>
                  {c.description && (
                    <p className="mt-1 text-xs text-foreground/70 line-clamp-1">
                      {c.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-foreground/60">
                    閲覧、{VIEW_LABEL[c.access_level_view]} ・ 投稿、{POST_LABEL[c.access_level_post]}
                    {c.posting_limit_per_day && ` ・ 1日 ${c.posting_limit_per_day} 件まで`}
                    {c.requires_tenure_months > 0 &&
                      ` ・ 入会 ${c.requires_tenure_months} ヶ月以上`}
                    {" ・ "}スレッド {threadCount} 件
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/admin/categories/${c.id}/edit`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs no-underline hover:bg-muted"
                  >
                    <i className="ri-pencil-line text-xs" aria-hidden />
                    編集
                  </Link>
                  <CategoryDeleteForm id={c.id} threadCount={threadCount} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 削除フォーム、スレッド数によって挙動を変える
// 0 件 → ワンタップで削除
// 1 件以上 → cascade チェックを促す詳細フォームを開く
function CategoryDeleteForm({
  id,
  threadCount,
}: {
  id: number;
  threadCount: number;
}) {
  if (threadCount === 0) {
    return (
      <form action={deleteCategory}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-xs hover:bg-rose-100"
        >
          <i className="ri-delete-bin-line text-xs" aria-hidden />
          削除
        </button>
      </form>
    );
  }
  return (
    <details className="relative inline-block">
      <summary className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-xs hover:bg-rose-100 cursor-pointer list-none">
        <i className="ri-delete-bin-line text-xs" aria-hidden />
        削除…
      </summary>
      <form
        action={deleteCategory}
        className="absolute right-0 z-10 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-rose-300 bg-rose-50 p-3 shadow-lg space-y-2"
      >
        <input type="hidden" name="id" value={id} />
        <p className="text-xs text-rose-900 leading-6">
          このカテゴリには <strong>{threadCount} 件のスレッド</strong>
          があります。削除すると元に戻せません。
        </p>
        <label className="flex items-start gap-2 text-xs text-rose-900">
          <input
            type="checkbox"
            name="cascade"
            value="on"
            required
            className="size-4 mt-0.5"
          />
          <span>中の投稿（スレッド・返信・添付画像）もまとめて削除する</span>
        </label>
        <button
          type="submit"
          className="inline-flex items-center min-h-[36px] px-4 rounded-full bg-rose-700 text-white text-xs font-medium active:opacity-90"
        >
          まとめて削除する
        </button>
      </form>
    </details>
  );
}
