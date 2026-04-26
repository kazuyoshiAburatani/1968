import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { SubmitButton } from "@/components/submit-button";
import { MediaPicker } from "@/components/media-picker";
import { fetchCategoryBySlug } from "@/lib/cached-categories";
import { getMediaUrl, type MediaItem } from "@/lib/media";
import { deleteThread, updateThread } from "./actions";

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

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      threadId,
    )
  ) {
    notFound();
  }

  const { supabase, user } = await requireSession();

  const { data: thread } = await supabase
    .from("threads")
    .select("id, title, body, media, user_id, category_id")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) notFound();
  if (thread.user_id !== user.id) {
    notFound();
  }

  const category = await fetchCategoryBySlug(slug);
  if (!category || category.id !== thread.category_id) notFound();

  const existingMedia = (thread.media as MediaItem[] | null) ?? [];

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
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

      <form
        action={updateThread}
        encType="multipart/form-data"
        className="mt-8 space-y-6"
      >
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

        {/* 既存メディアの管理 */}
        {existingMedia.length > 0 && (
          <fieldset>
            <legend className="block font-medium mb-2">添付済みのメディア</legend>
            <p className="text-xs text-foreground/60 mb-3">
              不要なものはチェックを入れて「保存する」を押すと削除されます。
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {existingMedia.map((m) => (
                <li
                  key={m.path}
                  className="rounded-lg border border-border overflow-hidden bg-muted/30"
                >
                  {m.type === "image" ? (
                    <Image
                      src={getMediaUrl(m.path)}
                      alt=""
                      width={300}
                      height={200}
                      unoptimized
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <video
                      src={getMediaUrl(m.path)}
                      className="w-full h-32 object-cover bg-foreground/10"
                      muted
                    />
                  )}
                  <label className="flex items-center gap-2 p-2 text-xs hover:bg-muted/40 cursor-pointer">
                    <input
                      type="checkbox"
                      name="remove_media"
                      value={m.path}
                      className="size-4"
                    />
                    <span>削除する</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {/* 新規メディア追加 */}
        <div>
          <p className="block font-medium mb-2">新しいメディアを追加</p>
          <MediaPicker />
        </div>

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

      {/* 削除セクション、別フォーム */}
      <section className="mt-12 pt-8 border-t border-border">
        <h2 className="font-bold text-base">スレッドを削除</h2>
        <p className="mt-2 text-sm text-foreground/70 leading-7">
          このスレッドを完全に削除します。返信・いいね・添付メディアもすべて消えます。
          元に戻せません。
        </p>
        <form
          action={deleteThread}
          className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-3"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="thread_id" value={threadId} />
          <label className="flex items-start gap-2 text-sm text-rose-900">
            <input
              type="checkbox"
              name="confirm"
              required
              className="size-4 mt-0.5"
            />
            <span>削除することを確認しました（必須）</span>
          </label>
          <button
            type="submit"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-rose-700 text-white text-sm font-medium hover:opacity-90 active:opacity-90"
          >
            このスレッドを削除する
          </button>
        </form>
      </section>
    </div>
  );
}
