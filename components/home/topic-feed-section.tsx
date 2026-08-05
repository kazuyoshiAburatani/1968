import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTopics, loadTopicResponses } from "@/lib/topics";
import { TopicSection } from "@/components/topics/topic-section";

// ホームのお題フィード。
//
// 独立した async コンポーネントに切り出してある。こうしておくと Suspense で
// 包めるので、重い問い合わせ（お題・返信・リアクション・書き手情報で 6 往復ほど）
// を待たずに、上にある二択が先に描画される。
// 二択は「開いた瞬間に押せる」ことが命なので、そこを他の読み込みで待たせない。
export async function TopicFeedSection() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const topics = await loadTopics(supabase, { limit: 4 });
  if (topics.length === 0) return null;

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

  const topicData = await loadTopicResponses(supabase, topics, {
    currentUserId: user?.id ?? null,
    previewOnly: true,
  });

  return (
    <div className="space-y-10">
      {topicData.map((d, i) => (
        <TopicSection
          key={d.topic.id}
          data={d}
          loggedIn={!!user}
          myNickname={myNickname}
          myAvatarPath={myAvatarPath}
          returnPath="/"
          eyebrow={
            i === 0
              ? d.topic.format === "fill_blank"
                ? "今週の穴埋め"
                : "今週のお題"
              : undefined
          }
        />
      ))}
    </div>
  );
}
