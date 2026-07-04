import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";

// 「新しく参加した人」、直近参加のニックネーム + 都道府県。
// フォロー機能は 1968 には無いので、単純に紹介するだけの UI。

type Member = {
  userId: string;
  nickname: string;
  prefecture: string | null;
  avatarUrl: string | null;
};

export async function NewMembersRail() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("profiles")
    .select("user_id, nickname, prefecture, avatar_url, created_at")
    .not("nickname", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const members: Member[] = (data ?? []).map((p) => ({
    userId: p.user_id as string,
    nickname: (p.nickname as string) ?? "会員",
    prefecture: (p.prefecture as string | null) ?? null,
    avatarUrl: publicAvatarUrl(p.avatar_url as string | null | undefined),
  }));

  if (members.length === 0) return null;

  return (
    <div className="bg-background rounded-xl p-5 shadow-sm border border-border/60">
      <h3 className="font-bold mb-4">新しく参加した人</h3>
      <ul className="space-y-3">
        {members.map((m) => (
          <li key={m.userId}>
            <Link
              href={`/u/${encodeURIComponent(m.nickname)}`}
              className="flex items-center gap-3 no-underline hover:opacity-90"
            >
              <UserAvatar
                avatarUrl={m.avatarUrl}
                name={m.nickname}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {m.nickname}
                </div>
                {m.prefecture && (
                  <div className="text-xs text-foreground/60 truncate">
                    {m.prefecture}
                  </div>
                )}
              </div>
              <span className="text-xs text-primary underline-offset-2 hover:underline shrink-0">
                プロフィール
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
