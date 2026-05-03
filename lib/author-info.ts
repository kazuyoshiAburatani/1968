import type { SupabaseClient } from "@supabase/supabase-js";
import { publicAvatarUrl } from "@/lib/avatar";

// 投稿表示用の、ニックネーム＋会員ランク＋アバター URL ＋称号フラグをまとめて取得するヘルパー。
//
// member_display ビューに is_founding_member / is_current_supporter が含まれていない
// 環境（マイグレーション未適用）でも動くよう、拡張選択がエラーになったらベース列で再試行する。

export type AuthorInfo = {
  nickname: string | null;
  rank: "member" | "verified" | null;
  isAi: boolean;
  isFoundingMember: boolean;
  isCurrentSupporter: boolean;
  avatarUrl: string | null;
};

export async function fetchAuthorInfo(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(userIds)];
  const map = new Map<string, AuthorInfo>();
  if (uniqueIds.length === 0) return map;

  // プロフィール、確実に存在する列のみ
  const profileRes = await supabase
    .from("profiles")
    .select("user_id, nickname, avatar_url")
    .in("user_id", uniqueIds);

  // member_display、まず拡張列で試行、失敗したらベース列のみで再取得
  const extendedSelect =
    "user_id, membership_rank, is_ai_persona, is_founding_member, is_current_supporter";
  const baseSelect = "user_id, membership_rank, is_ai_persona";

  let rankRows: Record<string, unknown>[] = [];
  const ext = await supabase
    .from("member_display")
    .select(extendedSelect)
    .in("user_id", uniqueIds);
  if (ext.error) {
    const fallback = await supabase
      .from("member_display")
      .select(baseSelect)
      .in("user_id", uniqueIds);
    rankRows = fallback.data ?? [];
  } else {
    rankRows = ext.data ?? [];
  }

  const init = (): AuthorInfo => ({
    nickname: null,
    rank: null,
    isAi: false,
    isFoundingMember: false,
    isCurrentSupporter: false,
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
  for (const r of rankRows) {
    const id = r.user_id as string;
    const current = map.get(id) ?? init();
    current.rank = r.membership_rank as "member" | "verified";
    current.isAi = r.is_ai_persona === true;
    current.isFoundingMember = r.is_founding_member === true;
    current.isCurrentSupporter = r.is_current_supporter === true;
    map.set(id, current);
  }

  return map;
}
