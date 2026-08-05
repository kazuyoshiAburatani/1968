import type { SupabaseClient } from "@supabase/supabase-js";
import { publicAvatarUrl } from "@/lib/avatar";

// 投稿表示に必要な、書き手の情報をまとめて取る。
// 1 投稿ずつ問い合わせると件数分の往復が発生するため、必ず ID の配列でまとめて引く。

export type AuthorInfo = {
  nickname: string | null;
  prefecture: string | null;
  avatarUrl: string | null;
  isFoundingMember: boolean;
  /** 学年（年度）。1968 = 昭和43年度 */
  schoolYear: number | null;
};

export async function fetchAuthorInfo(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(userIds)];
  const map = new Map<string, AuthorInfo>();
  if (uniqueIds.length === 0) return map;

  // profiles 本体は自分の行しか読めない。
  // 他人の表示情報は、列を絞った公開ビュー profiles_public から取る。
  const [profileRes, displayRes] = await Promise.all([
    supabase
      .from("profiles_public")
      .select("user_id, nickname, prefecture, avatar_url, school_year")
      .in("user_id", uniqueIds),
    supabase
      .from("member_display")
      .select("user_id, is_founding_member")
      .in("user_id", uniqueIds),
  ]);

  type ProfileRow = {
    user_id: string;
    nickname: string | null;
    prefecture: string | null;
    avatar_url: string | null;
    school_year: number | null;
  };
  type DisplayRow = { user_id: string; is_founding_member: boolean | null };

  const foundingByUser = new Map(
    ((displayRes.data ?? []) as DisplayRow[]).map((d) => [
      d.user_id,
      d.is_founding_member === true,
    ]),
  );

  for (const p of (profileRes.data ?? []) as ProfileRow[]) {
    map.set(p.user_id, {
      nickname: p.nickname,
      prefecture: p.prefecture,
      avatarUrl: publicAvatarUrl(p.avatar_url),
      isFoundingMember: foundingByUser.get(p.user_id) === true,
      schoolYear: p.school_year,
    });
  }

  // プロフィール未作成のユーザーも空欄で埋めておく（表示側で分岐を減らすため）
  for (const id of uniqueIds) {
    if (!map.has(id)) {
      map.set(id, {
        nickname: null,
        prefecture: null,
        avatarUrl: null,
        isFoundingMember: foundingByUser.get(id) === true,
        schoolYear: null,
      });
    }
  }

  return map;
}
