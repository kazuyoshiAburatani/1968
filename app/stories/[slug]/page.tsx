import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTopics, loadTopicResponses } from "@/lib/topics";
import { TopicSection } from "@/components/topics/topic-section";

type Props = {
  params: Promise<{ slug: string }>;
};

type StoryRow = {
  id: string;
  slug: string;
  title: string;
  lead: string;
  body: string;
  topic_id: string | null;
  published_at: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stories")
    .select("title, lead")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { title: "記事" };
  return {
    title: data.title as string,
    description: data.lead as string,
    openGraph: {
      title: data.title as string,
      description: data.lead as string,
    },
  };
}

// 企画記事の本文と、その下の投稿欄。
// 投稿欄は専用の仕組みを作らず、記事に紐づいたお題（topics）を再利用している。
// 記事を読んで気持ちが動いた流れのまま書ける位置に置くのが肝で、
// 別ページに分けると書く人が激減する。
export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("stories")
    .select("id, slug, title, lead, body, topic_id, published_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) notFound();
  const story = data as StoryRow;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myNickname = "あなた";
  let myAvatarPath: string | null = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    myNickname = (p?.nickname as string | undefined) ?? "あなた";
    myAvatarPath = (p?.avatar_url as string | undefined) ?? null;
  }

  let topicBlock = null;
  if (story.topic_id) {
    const topics = await loadTopics(supabase, { topicId: story.topic_id });
    if (topics.length > 0) {
      const [d] = await loadTopicResponses(supabase, topics, {
        currentUserId: user?.id ?? null,
        previewOnly: false,
      });
      topicBlock = (
        <TopicSection
          data={d}
          loggedIn={!!user}
          myNickname={myNickname}
          myAvatarPath={myAvatarPath}
          returnPath={`/stories/${slug}`}
          showMoreLink={false}
          eyebrow="この記事について"
        />
      );
    }
  }

  const paragraphs = story.body.split(/\n{2,}/).filter((p) => p.trim());
  const published = new Date(story.published_at);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
      <Link
        href="/stories"
        className="text-sm no-underline hover:underline inline-flex items-center gap-1"
      >
        ← 連載の一覧へ
      </Link>

      <article>
        <p className="text-sm text-foreground/50">
          {published.getFullYear()}年{published.getMonth() + 1}月
          {published.getDate()}日
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-snug">
          {story.title}
        </h1>
        <p className="mt-3 text-base leading-8 text-foreground/70 border-l-4 border-accent/60 pl-4">
          {story.lead}
        </p>

        <div className="mt-6 space-y-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-base leading-9 text-foreground">
              {p}
            </p>
          ))}
        </div>
      </article>

      {topicBlock}
    </div>
  );
}
