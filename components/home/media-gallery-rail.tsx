import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMediaUrl, type MediaItem } from "@/lib/media";
import type { ReactionType } from "@/lib/reactions";

// 好きな写真のコーナー、お題への回答に添付された画像を人気順で表示。
// - 直近 100 件の回答（返信含む）から画像を持つものを抽出
// - リアクション合計で並び替え、上位 8 枚
// - タップでその回答が属するお題ページへ

type Item = {
  responseId: string;
  topicId: string;
  nickname: string;
  path: string;
  reactionCount: number;
};

export async function MediaGalleryRail({ limit = 8 }: { limit?: number }) {
  const supabase = await createSupabaseServerClient();

  // 直近 200 件の回答から画像持ちを抽出
  const { data: responses } = await supabase
    .from("topic_responses")
    .select("id, topic_id, user_id, media")
    .order("created_at", { ascending: false })
    .limit(200);

  const withMedia = (responses ?? []).filter((r) => {
    const media = r.media as unknown as MediaItem[] | null;
    return Array.isArray(media) && media.some((m) => m.type === "image");
  });

  if (withMedia.length === 0) return null;

  // リアクションを一括取得、response ごとに集計
  const ids = withMedia.map((r) => r.id as string);
  const { data: likes } = await supabase
    .from("likes")
    .select("target_id")
    .eq("target_type", "topic_response")
    .in("target_id", ids);
  const reactionByResponse = new Map<string, number>();
  for (const l of likes ?? []) {
    const tid = l.target_id as string;
    reactionByResponse.set(tid, (reactionByResponse.get(tid) ?? 0) + 1);
  }

  // 投稿者ニックネームを一括取得
  const userIds = Array.from(new Set(withMedia.map((r) => r.user_id as string)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, nickname")
    .in("user_id", userIds);
  const nicknameByUser = new Map<string, string>();
  for (const p of profiles ?? []) {
    nicknameByUser.set(p.user_id as string, (p.nickname as string) ?? "会員");
  }

  const items: Item[] = withMedia
    .map((r) => {
      const media = r.media as unknown as MediaItem[];
      const firstImage = media.find((m) => m.type === "image");
      if (!firstImage) return null;
      return {
        responseId: r.id as string,
        topicId: r.topic_id as string,
        nickname: nicknameByUser.get(r.user_id as string) ?? "会員",
        path: firstImage.path,
        reactionCount: reactionByResponse.get(r.id as string) ?? 0,
      };
    })
    .filter((v): v is Item => v !== null)
    .sort((a, b) => {
      // リアクション数優先、同数なら新しい方が上
      if (b.reactionCount !== a.reactionCount) {
        return b.reactionCount - a.reactionCount;
      }
      return 0;
    })
    .slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              好きな写真のコーナー
            </h2>
            <p className="mt-1 text-sm sm:text-base text-foreground/60">
              みんなの回答に添付された、心に残る一枚
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((it) => (
            <Link
              key={it.responseId}
              href={`/topics/${it.topicId}#response-${it.responseId}`}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted no-underline"
            >
              <Image
                src={getMediaUrl(it.path)}
                alt={`${it.nickname} の投稿`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="text-white">
                  <div className="text-sm font-medium leading-snug">
                    {it.nickname}
                  </div>
                  {it.reactionCount > 0 && (
                    <div className="text-xs opacity-90 mt-0.5">
                      ♥ {it.reactionCount}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
