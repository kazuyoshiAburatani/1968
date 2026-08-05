import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTopics, loadTopicResponses } from "@/lib/topics";
import { TopicSection } from "@/components/topics/topic-section";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("topics")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return { title: (data?.title as string | undefined) ?? "お題" };
}

// お題詳細、そのお題の全ての答えを見せる。
export default async function TopicDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const topics = await loadTopics(supabase, { topicId: id });
  if (topics.length === 0) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myNickname = "あなた";
  let myAvatarPath: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    myNickname = (data?.nickname as string | undefined) ?? "あなた";
    myAvatarPath = (data?.avatar_url as string | undefined) ?? null;
  }

  const [data] = await loadTopicResponses(supabase, topics, {
    currentUserId: user?.id ?? null,
    previewOnly: false,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <Link
        href="/"
        className="text-sm no-underline hover:underline inline-flex items-center gap-1"
      >
        ← ホームへ戻る
      </Link>

      <TopicSection
        data={data}
        loggedIn={!!user}
        myNickname={myNickname}
        myAvatarPath={myAvatarPath}
        returnPath={`/topics/${id}`}
        showMoreLink={false}
      />
    </div>
  );
}
