import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { SubmitButton } from "@/components/submit-button";
import { updateThread } from "./actions";

export const metadata: Metadata = {
  title: "スレッドを編集",
};

type Props = {
  params: Promise<{ slug: string; thread: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditThreadPage({ params, searchParams }: Props) {
  const { slug, thread: threadId } = await params;
  const { error } = await searchParams;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)) {
    notFound();
  }

  const { supabase, user } = await requireSession();

  const { data: thread } = await supabase
    .from("threads")
    .select("id, title, body, user_id, category_id")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) notFound();
  if (thread.user_id !== user.id) {
    // 他人のスレッドは編集不可
    notFound();
  }

  // カテゴリ slug の整合確認
  const { data: category } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!category || category.id !== thread.category_id) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <nav className="mb-4 text-sm">
        <Link href={`/board/${slug}/${threadId}`}>← スレッドに戻る</Link>
      </nav>

      <h1 className="text-2xl font-bold">スレッドを編集</h1>
      <p className="mt-1 text-sm text-foreground/70">
        カテゴリ、{category.name}
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={updateThread} className="mt-8 space-y-6">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="thread_id" value={threadId} />

        <label className="block">
          <span className="block font-medium mb-2">件名（100文字以内）</span>
          <input
            type="text"
            name="title"
            defaultValue={thread.title}
            required
            maxLength={100}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </label>

        <label className="block">
          <span className="block font-medium mb-2">本文（5000文字以内）</span>
          <textarea
            name="body"
            defaultValue={thread.body}
            required
            maxLength={5000}
            rows={10}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </label>

        <p className="text-xs text-foreground/60">
          添付されたメディアは編集できません。差し替えたい場合は一度スレッドを削除して新しく投稿してください（削除機能はフェーズ6で実装予定）。
        </p>

        <div className="flex gap-3">
          <SubmitButton pendingText="保存中…">保存する</SubmitButton>
          <Link
            href={`/board/${slug}/${threadId}`}
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-border no-underline hover:bg-muted"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
