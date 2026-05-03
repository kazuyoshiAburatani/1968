import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rank } from "@/lib/auth/permissions";

// 現在の閲覧ユーザーのランクを取得するユーティリティ。
// 未ログインは guest、public.users が無ければ member（既定値）として扱う。
//
// 運営（admins テーブルに登録されたユーザー）は、users.verified の状態に関わらず
// 自動的に verified 扱いとする。コミュニティ全体のモデレーションに支障を出さないため。
export async function getCurrentRank(
  supabase: SupabaseClient,
): Promise<{ rank: Rank; userId: string | null; isAdmin: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { rank: "guest", userId: null, isAdmin: false };
  }

  // ユーザー情報と admin チェックを並列取得
  const [{ data: publicUser }, { data: adminRow }] = await Promise.all([
    supabase
      .from("users")
      .select("membership_rank")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isAdmin = !!adminRow;
  const rawRank = ((publicUser?.membership_rank as Rank | undefined) ??
    "member") as Rank;
  // 運営は自動で verified、それ以外はそのまま
  const rank: Rank = isAdmin ? "verified" : rawRank;
  return { rank, userId: user.id, isAdmin };
}
