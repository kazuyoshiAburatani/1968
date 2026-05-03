import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// 1968 の代表運営（super_admin）の user_id を取得する。
// 「油谷さん直通チャンネル」など、運営宛 DM 動線で参照する。
//
// admins テーブルから super_admin role の最古レコードを 1 件返す。
// 1 時間キャッシュ、運営の追加・削除時のみ revalidateTag('operator') で無効化。

export const getOperatorUserId = unstable_cache(
  async (): Promise<string | null> => {
    try {
      const sb = getSupabaseAdminClient();
      const { data } = await sb
        .from("admins")
        .select("user_id, role, created_at")
        .eq("role", "super_admin")
        .not("user_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data?.user_id as string | null) ?? null;
    } catch (e) {
      console.error("[operator] failed to resolve:", e);
      return null;
    }
  },
  ["operator-user-id"],
  { revalidate: 3600, tags: ["operator"] },
);

// 運営宛 DM の canSend 判定用、peer_user_id が運営かどうか
export async function isOperator(peerUserId: string): Promise<boolean> {
  const operatorId = await getOperatorUserId();
  return operatorId !== null && operatorId === peerUserId;
}
