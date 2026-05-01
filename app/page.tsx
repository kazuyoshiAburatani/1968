import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";
import { HomeGuest } from "@/components/home/home-guest";
import { HomeMember } from "@/components/home/home-member";
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
// guest   → HomeGuest、ランディング、段階A 4 カテゴリのみ閲覧可
// member  → HomeMember、無料会員ダッシュボード、段階A+B 閲覧可
// regular → HomeRegular、正会員ダッシュボード、全カテゴリ
export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();
  const nickname = (profile?.nickname as string | undefined) ?? "会員";

  if (rank === "verified") {
    return <HomeRegular nickname={nickname} userId={userId} />;
  }
  return <HomeMember nickname={nickname} userId={userId} />;
}
