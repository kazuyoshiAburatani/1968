import type { SupabaseClient } from "@supabase/supabase-js";
import { publicAvatarUrl } from "@/lib/avatar";

// 投稿表示用の、ニックネーム＋会員ランク＋アバター URL をまとめて取得するヘルパー。

export type AuthorInfo = {
  nickname: string | null;
  rank: "member" | "regular" | null;
  isAi: boolean;
  avatarUrl: string | null;
};

export async function fetchAuthorInfo(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(userIds)];
  const map = new Map<string, AuthorInfo>();
  if (uniqueIds.length === 0) return map;

  const [profileRes, rankRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", uniqueIds),
    supabase
      .from("member_display")
      .select("user_id, membership_rank, is_ai_persona")
      .in("user_id", uniqueIds),
  ]);

  const init = (): AuthorInfo => ({
    nickname: null,
    rank: null,
    isAi: false,
    avatarUrl: null,
  });
  for (const id of uniqueIds) {
    map.set(id, init());
  }
  for (const p of profileRes.data ?? []) {
    const current = map.get(p.user_id as string) ?? init();
    current.nickname = p.nickname as string;
    current.avatarUrl = publicAvatarUrl(p.avatar_url as string | null);
    map.set(p.user_id as string, current);
  }
  for (const r of rankRes.data ?? []) {
    const current = map.get(r.user_id as string) ?? init();
    current.rank = r.membership_rank as "member" | "regular";
    current.isAi = r.is_ai_persona === true;
    map.set(r.user_id as string, current);
  }

  return map;
}
