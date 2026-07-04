import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMediaUrl, type MediaItem } from "@/lib/media";

// みんなの思い出ギャラリー、直近の投稿添付画像から自動生成。
// 画像添付のあるスレッドを新しい順に走査し、最初の 8 枚を並べる。
// タップで元スレッドへ遷移。

type Item = {
  threadId: string;
  categorySlug: string;
  title: string;
  nickname: string;
  path: string;
};

export async function MediaGalleryRail({ limit = 8 }: { limit?: number }) {
  const supabase = await createSupabaseServerClient();

  // 直近 100 スレッドを取得し、media を持つものだけ拾って上位 8 枚
  const { data: threads } = await supabase
    .from("threads")
    .select("id, title, media, categories(slug), user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const withMedia = (threads ?? []).filter((t) => {
    const media = t.media as unknown as MediaItem[] | null;
    return Array.isArray(media) && media.some((m) => m.type === "image");
  });

  // 投稿者ニックネームを一括取得
  const userIds = Array.from(new Set(withMedia.map((t) => t.user_id as string)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, nickname")
    .in("user_id", userIds);
  const nicknameByUser = new Map<string, string>();
  for (const p of profiles ?? []) {
    nicknameByUser.set(p.user_id as string, (p.nickname as string) ?? "会員");
  }

  const items: Item[] = [];
  for (const t of withMedia) {
    if (items.length >= limit) break;
    const media = t.media as unknown as MediaItem[];
    const firstImage = media.find((m) => m.type === "image");
    if (!firstImage) continue;
    const cat = t.categories as { slug?: string } | null;
    items.push({
      threadId: t.id as string,
      categorySlug: cat?.slug ?? "",
      title: t.title as string,
      nickname: nicknameByUser.get(t.user_id as string) ?? "会員",
      path: firstImage.path,
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              みんなの思い出ギャラリー
            </h2>
            <p className="mt-1 text-sm sm:text-base text-foreground/60">
              最近投稿された、あの頃の写真や今の一枚
            </p>
          </div>
          <Link
            href="/timeline"
            className="hidden sm:inline-flex items-center gap-1 text-primary border-2 border-primary rounded-full px-5 py-2 text-sm font-medium hover:bg-primary hover:text-white transition-colors no-underline"
          >
            もっと見る
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((it) => (
            <Link
              key={`${it.threadId}-${it.path}`}
              href={`/board/${it.categorySlug}/${it.threadId}`}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted no-underline"
            >
              <Image
                src={getMediaUrl(it.path)}
                alt={it.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="text-white">
                  <div className="text-sm font-medium leading-snug line-clamp-2">
                    {it.title}
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">
                    {it.nickname}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 sm:hidden text-center">
          <Link
            href="/timeline"
            className="inline-flex items-center gap-1 text-primary border-2 border-primary rounded-full px-5 py-2 text-sm font-medium no-underline"
          >
            もっと見る
          </Link>
        </div>
      </div>
    </section>
  );
}
