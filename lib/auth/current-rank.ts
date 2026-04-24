import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rank } from "@/lib/auth/permissions";

// 現在の閲覧ユーザーのランクを取得するユーティリティ。
// 未ログインは guest、public.users が無ければ member（既定値）として扱う。
export async function getCurrentRank(
  supabase: SupabaseClient,
): Promise<{ rank: Rank; userId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { rank: "guest", userId: null };
  }

  const { data: publicUser } = await supabase
    .from("users")
    .select("membership_rank")
    .eq("id", user.id)
    .maybeSingle();

  const rank = ((publicUser?.membership_rank as Rank | undefined) ??
    "member") as Rank;
  return { rank, userId: user.id };
}
