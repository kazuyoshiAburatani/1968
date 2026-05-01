import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { CategoryForm } from "../../category-form";
import { updateCategory } from "../../actions";

export const metadata: Metadata = { title: "カテゴリを編集" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditCategoryPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { error } = await searchParams;

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const sb = getSupabaseAdminClient();
  const { data: cat } = await sb
    .from("categories")
    .select(
      "id, slug, name, description, display_order, tier, access_level_view, access_level_post, posting_limit_per_day, requires_tenure_months",
    )
    .eq("id", numericId)
    .maybeSingle();
  if (!cat) notFound();

  return (
    <div>
      <nav className="text-sm mb-3">
        <Link href="/admin/categories">← カテゴリ一覧へ</Link>
      </nav>
      <h1 className="text-2xl font-bold">カテゴリを編集</h1>
      <p className="mt-1 text-xs text-foreground/60">id #{cat.id}</p>
      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 text-red-900 px-4 py-2.5 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}
      <CategoryForm
        action={updateCategory}
        submitLabel="保存する"
        initial={{
          id: cat.id as number,
          slug: cat.slug as string,
          name: cat.name as string,
          description: (cat.description as string | null) ?? null,
          display_order: cat.display_order as number,
          tier: cat.tier as "A" | "B" | "C" | "D",
          access_level_view: cat.access_level_view as
            | "guest"
            | "member"
            | "verified",
          access_level_post: cat.access_level_post as "member" | "verified",
          posting_limit_per_day:
            (cat.posting_limit_per_day as number | null) ?? null,
          requires_tenure_months: cat.requires_tenure_months as number,
        }}
      />
    </div>
  );
}
