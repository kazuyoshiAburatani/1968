import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import { canPost, type PostLevel } from "@/lib/auth/permissions";
import { SubmitButton } from "@/components/submit-button";
import { createThread } from "./actions";

export const metadata: Metadata = {
  title: "新しいスレッド",
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewThreadPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { rank, userId } = await getCurrentRank(supabase);

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(`/board/${slug}/new`)}`);
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, slug, name, description, access_level_post, posting_limit_per_day")
    .eq("slug", slug)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  if (!canPost(rank, category.access_level_post as PostLevel)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <nav className="mb-4 text-sm">
          <Link href={`/board/${slug}`}>← {category.name} へ戻る</Link>
        </nav>
        <h1 className="text-2xl font-bold">投稿できません</h1>
        <p className="mt-2 text-sm">
          このカテゴリへの投稿は
          {category.access_level_post === "associate" ? "準会員以上" : "正会員"}
          の方にお願いしています。
        </p>
        <p className="mt-6">
          <Link
            href="/mypage"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-fg)] font-medium no-underline hover:opacity-90"
          >
            マイページへ
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <nav className="mb-4 text-sm">
        <Link href={`/board/${slug}`}>← {category.name} へ戻る</Link>
      </nav>

      <h1 className="text-2xl font-bold">新しいスレッド</h1>
      <p className="mt-1 text-sm text-[color:var(--color-foreground)]/70">
        カテゴリ、{category.name}
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createThread} encType="multipart/form-data" className="mt-8 space-y-6">
        <input type="hidden" name="slug" value={slug} />

        <label className="block">
          <span className="block font-medium mb-2">件名（100文字以内）</span>
          <input
            type="text"
            name="title"
            required
            maxLength={100}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </label>

        <label className="block">
          <span className="block font-medium mb-2">本文（5000文字以内）</span>
          <textarea
            name="body"
            required
            maxLength={5000}
            rows={10}
            className="w-full px-3 py-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="font-medium">添付（画像は最大4枚、または動画1本）</legend>
          <label className="block text-sm">
            <span className="block mb-1 text-[color:var(--color-foreground)]/70">
              画像（JPEG/PNG/WebP/GIF、1枚あたり5MB以下、最大4枚）
            </span>
            <input
              type="file"
              name="images"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block w-full text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="block mb-1 text-[color:var(--color-foreground)]/70">
              または動画1本（MP4/MOV、50MB以下）
            </span>
            <input
              type="file"
              name="video"
              accept="video/mp4,video/quicktime"
              className="block w-full text-sm"
            />
          </label>
        </fieldset>

        <div className="flex gap-3">
          <SubmitButton pendingText="投稿中…">スレッドを書く</SubmitButton>
          <Link
            href={`/board/${slug}`}
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-[color:var(--color-border)] no-underline hover:bg-[color:var(--color-muted)]"
          >
            キャンセル
          </Link>
        </div>

        {category.posting_limit_per_day && (
          <p className="text-xs text-[color:var(--color-foreground)]/60">
            このカテゴリは1日{category.posting_limit_per_day}件まで投稿できます。
          </p>
        )}
      </form>
    </div>
  );
}
