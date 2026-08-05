import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rank } from "@/lib/auth/permissions";

// 現在の閲覧者のランクと称号を取得する。
// 未ログインは guest、ログイン済みは一律 member。
// 匿名サインイン（ニックネーム＋生年月日だけの 30 秒登録）でも member として扱う。

export type CurrentUser = {
  rank: Rank;
  userId: string | null;
  isAdmin: boolean;
  isFoundingMember: boolean;
  /** 匿名登録のまま（メール未設定）かどうか。引き継ぎ案内の出し分けに使う。 */
  isAnonymous: boolean;
};

export async function getCurrentRank(
  supabase: SupabaseClient,
): Promise<CurrentUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      rank: "guest",
      userId: null,
      isAdmin: false,
      isFoundingMember: false,
      isAnonymous: false,
    };
  }

  const [{ data: publicUser }, { data: adminRow }] = await Promise.all([
    supabase
      .from("users")
      .select("is_founding_member")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("admins").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    rank: "member",
    userId: user.id,
    isAdmin: !!adminRow,
    isFoundingMember: publicUser?.is_founding_member === true,
    // Supabase は匿名ユーザーに is_anonymous を立てる。
    // メールを紐付けて本登録すると false になる。
    isAnonymous: user.is_anonymous === true || !user.email,
  };
}
