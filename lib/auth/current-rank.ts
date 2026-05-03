import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rank } from "@/lib/auth/permissions";

// 現在の閲覧ユーザーのランク + 称号フラグを取得するユーティリティ。
// 未ログインは guest、public.users が無ければ member（既定値）として扱う。
//
// 運営（admins テーブル登録ユーザー）は users.verified の状態に関わらず
// 自動で verified 扱いとし、isAdmin=true。
// 創設メンバー / 応援団 のフラグも併せて返し、ラウンジアクセス可否の UI 判定に使う。
//
// マイグレーション未適用環境（is_founding_member 列なし、supporters テーブルなし）でも
// クラッシュしないよう、各クエリを try/catch で吸収する。
export async function getCurrentRank(
  supabase: SupabaseClient,
): Promise<{
  rank: Rank;
  userId: string | null;
  isAdmin: boolean;
  isFoundingMember: boolean;
  isCurrentSupporter: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      rank: "guest",
      userId: null,
      isAdmin: false,
      isFoundingMember: false,
      isCurrentSupporter: false,
    };
  }

  // 主クエリ、必須フィールドのみ。レアな列に依存させない
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
  const rank: Rank = isAdmin ? "verified" : rawRank;

  // 創設メンバーフラグ、未適用なら false
  let isFoundingMember = false;
  try {
    const { data } = await supabase
      .from("users")
      .select("is_founding_member")
      .eq("id", user.id)
      .maybeSingle();
    isFoundingMember = data?.is_founding_member === true;
  } catch {
    /* 列未適用、無視 */
  }

  // 当年の応援団フラグ、テーブル未適用なら false
  let isCurrentSupporter = false;
  try {
    const tokyoYear = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
    ).getFullYear();
    const { data } = await supabase
      .from("supporters")
      .select("year")
      .eq("user_id", user.id)
      .eq("year", tokyoYear)
      .maybeSingle();
    isCurrentSupporter = !!data;
  } catch {
    /* テーブル未適用、無視 */
  }

  return { rank, userId: user.id, isAdmin, isFoundingMember, isCurrentSupporter };
}
