import Link from "next/link";
import type { Metadata } from "next";
import { CategoryForm } from "../category-form";
import { createCategory } from "../actions";

export const metadata: Metadata = { title: "新しいカテゴリ" };

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewCategoryPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <div>
      <nav className="text-sm mb-3">
        <Link href="/admin/categories">← カテゴリ一覧へ</Link>
      </nav>
      <h1 className="text-2xl font-bold">新しいカテゴリ</h1>
      <p className="mt-2 text-sm text-foreground/70">
        新しいカテゴリを追加します。slug はあとから変更できますが、URL が変わるため慎重に決めてください。
      </p>
      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 text-red-900 px-4 py-2.5 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}
      <CategoryForm action={createCategory} submitLabel="作成する" />
    </div>
  );
}
