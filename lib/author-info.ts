import type { SupabaseClient } from "@supabase/supabase-js";

// 投稿表示用の、ニックネーム＋会員ランクをまとめて取得するヘルパー。
// profiles テーブルから nickname を、member_display ビューから rank を取り、
// user_id → { nickname, rank } の Map として返す。

export type AuthorInfo = {
  nickname: string | null;
  rank: "member" | "regular" | null;
};

export async function fetchAuthorInfo(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(userIds)];
  const map = new Map<string, AuthorInfo>();
  if (uniqueIds.length === 0) return map;

  const [profileRes, rankRes] = await Promise.all([
    supabase.from("profiles").select("user_id, nickname").in("user_id", uniqueIds),
    supabase
      .from("member_display")
      .select("user_id, membership_rank")
      .in("user_id", uniqueIds),
  ]);

  for (const id of uniqueIds) {
    map.set(id, { nickname: null, rank: null });
  }
  for (const p of profileRes.data ?? []) {
    const current = map.get(p.user_id as string) ?? { nickname: null, rank: null };
    current.nickname = p.nickname as string;
    map.set(p.user_id as string, current);
  }
  for (const r of rankRes.data ?? []) {
    const current = map.get(r.user_id as string) ?? { nickname: null, rank: null };
    current.rank = r.membership_rank as "member" | "regular";
    map.set(r.user_id as string, current);
  }

  return map;
}
