import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import { canPost, type PostLevel } from "@/lib/auth/permissions";
import { SubmitButton } from "@/components/submit-button";
import { MediaPicker } from "@/components/media-picker";
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
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-medium no-underline hover:opacity-90"
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
      <p className="mt-1 text-sm text-foreground/70">
        カテゴリ、{category.name}
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          <p>{decodeURIComponent(error)}</p>
          {/^このカテゴリは1日\d+件までです$/.test(decodeURIComponent(error)) && (
            <p className="mt-2">
              正会員にアップグレードすると、このカテゴリの制限が解除され、段階B以降のカテゴリにも投稿できます。
              詳しくは{" "}
              <Link href="/mypage" className="underline font-medium">
                マイページ
              </Link>
              をご覧ください。
            </p>
          )}
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
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </label>

        <label className="block">
          <span className="block font-medium mb-2">本文（5000文字以内）</span>
          <textarea
            name="body"
            required
            maxLength={5000}
            rows={10}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </label>

        <MediaPicker />

        <div className="flex gap-3">
          <SubmitButton pendingText="投稿中…">スレッドを書く</SubmitButton>
          <Link
            href={`/board/${slug}`}
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-border no-underline hover:bg-muted"
          >
            キャンセル
          </Link>
        </div>

        {category.posting_limit_per_day && (
          <p className="text-xs text-foreground/60">
            このカテゴリは1日{category.posting_limit_per_day}件まで投稿できます。
          </p>
        )}
      </form>
    </div>
  );
}
