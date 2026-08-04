import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResponseCard } from "@/components/topics/response-card";
import { ResponseComposer } from "@/components/topics/response-composer";
import type { MediaItem } from "@/lib/media";
import type { ReactionType } from "@/lib/reactions";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("topics")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return {
    title: (data?.title as string | undefined) ?? "お題",
  };
}

type ResponseRow = {
  id: string;
  user_id: string;
  body: string;
  media: MediaItem[];
  created_at: string;
  admin_edited_at: string | null;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  prefecture: string | null;
  avatar_url: string | null;
};

type LikeRow = {
  target_id: string;
  reaction_type: ReactionType;
  user_id: string;
};

// お題の詳細ページ、そのお題への全ての答えを表示。
// トップの TopicFeed から「全ての答えを見る」で遷移。
export default async function TopicDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("id, title, body, published_at, expires_at, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!topic || !(topic.is_active as boolean)) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myProfile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname, prefecture, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    myProfile = data as ProfileRow | null;
  }

  const { data: responsesData } = await supabase
    .from("topic_responses")
    .select("id, user_id, body, media, created_at, admin_edited_at")
    .eq("topic_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  const responses = ((responsesData ?? []) as unknown) as ResponseRow[];

  const userIds = Array.from(new Set(responses.map((r) => r.user_id)));
  let profilesData: ProfileRow[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname, prefecture, avatar_url")
      .in("user_id", userIds);
    profilesData = (data ?? []) as ProfileRow[];
  }
  const profileByUser = new Map(profilesData.map((p) => [p.user_id, p]));

  const responseIds = responses.map((r) => r.id);
  let likes: LikeRow[] = [];
  if (responseIds.length > 0) {
    const { data } = await supabase
      .from("likes")
      .select("target_id, reaction_type, user_id")
      .eq("target_type", "topic_response")
      .in("target_id", responseIds);
    likes = ((data ?? []) as unknown) as LikeRow[];
  }
  const countsByResponse = new Map<
    string,
    Partial<Record<ReactionType, number>>
  >();
  const myReactionByResponse = new Map<string, ReactionType>();
  for (const l of likes) {
    const c = countsByResponse.get(l.target_id) ?? {};
    c[l.reaction_type] = (c[l.reaction_type] ?? 0) + 1;
    countsByResponse.set(l.target_id, c);
    if (user && l.user_id === user.id) {
      myReactionByResponse.set(l.target_id, l.reaction_type);
    }
  }

  const returnPath = `/topics/${id}`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <Link
        href="/"
        className="text-sm text-primary no-underline hover:underline inline-flex items-center gap-1"
      >
        ← ホームへ戻る
      </Link>

      <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <i className="ri-chat-quote-line text-base" aria-hidden />
          今週のお題
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground leading-snug">
          {topic.title}
        </h1>
        {topic.body && (
          <p className="mt-3 text-sm sm:text-base text-foreground/80 leading-7 whitespace-pre-wrap">
            {topic.body}
          </p>
        )}
        <div className="mt-3 text-xs text-foreground/50">
          {responses.length} 件の答え
        </div>
      </section>

      <ResponseComposer
        topicId={topic.id as string}
        nickname={myProfile?.nickname ?? "会員"}
        avatarPath={myProfile?.avatar_url}
        guest={!user}
      />

      {responses.length === 0 ? (
        <p className="text-center text-sm text-foreground/60 py-8">
          このお題にはまだ答えがありません、一番乗りしませんか？
        </p>
      ) : (
        <div className="space-y-3">
          {responses.map((r) => {
            const p = profileByUser.get(r.user_id);
            return (
              <ResponseCard
                key={r.id}
                responseId={r.id}
                nickname={p?.nickname ?? "会員"}
                prefecture={p?.prefecture ?? null}
                avatarPath={p?.avatar_url}
                body={r.body}
                media={r.media ?? []}
                createdAt={r.created_at}
                reactionCounts={countsByResponse.get(r.id) ?? {}}
                myReaction={myReactionByResponse.get(r.id) ?? null}
                returnPath={returnPath}
                adminEdited={!!r.admin_edited_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
