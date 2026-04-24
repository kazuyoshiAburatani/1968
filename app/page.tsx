import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import { HomeGuest } from "@/components/home/home-guest";
import { HomePending } from "@/components/home/home-pending";
import { HomeAssociate } from "@/components/home/home-associate";
import { HomeRegular } from "@/components/home/home-regular";

type Props = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
};

// トップページはランクに応じて出し分けする。
// guest    → HomeGuest、ランディング
// pending  → HomePending、課金誘導中心
// associate→ HomeAssociate、段階A・B のダッシュボード
// regular  → HomeRegular、全カテゴリの本格ダッシュボード
export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;

  // Supabase から戻ってきた code / error は /auth/callback や /login に誘導
  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`);
  }
  if (params.error) {
    const reason = params.error_code ?? params.error;
    redirect(`/login?error=${encodeURIComponent(reason)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { rank, userId } = await getCurrentRank(supabase);

  if (!userId) {
    return <HomeGuest />;
  }

  // ニックネーム取得（ヘッダーで同じ問い合わせがあるが、ページ本体でも使うので再取得）
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();
  const nickname = (profile?.nickname as string | undefined) ?? "会員";

  if (rank === "regular") {
    return <HomeRegular nickname={nickname} userId={userId} />;
  }
  if (rank === "associate") {
    return <HomeAssociate nickname={nickname} userId={userId} />;
  }
  // pending およびフォールバック
  return <HomePending nickname={nickname} />;
}
