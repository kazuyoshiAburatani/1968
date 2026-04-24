import { requireSession } from "@/lib/auth/require-session";

// マイページの最小実装、フェーズ2ステップ2.11で本実装する想定。
// 現時点は認証・プロフィール存在チェックが動いているかの目視確認が目的。
export default async function MyPage() {
  const { supabase, user } = await requireSession();

  const { data: publicUser } = await supabase
    .from("users")
    .select("email, membership_rank, status, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, birth_month, birth_day, prefecture")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">マイページ</h1>
      <p className="mt-2">
        {profile?.nickname} さん、こんにちは。
      </p>

      <section className="mt-8">
        <h2 className="font-bold text-lg">アカウント情報</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-4">
            <dt className="w-32 text-[color:var(--color-foreground)]/70">メール</dt>
            <dd>{publicUser?.email}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-32 text-[color:var(--color-foreground)]/70">会員ランク</dt>
            <dd>{publicUser?.membership_rank}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-32 text-[color:var(--color-foreground)]/70">誕生日</dt>
            <dd>
              1968年{profile?.birth_month}月{profile?.birth_day}日
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-32 text-[color:var(--color-foreground)]/70">都道府県</dt>
            <dd>{profile?.prefecture ?? "未設定"}</dd>
          </div>
        </dl>
      </section>

      <p className="mt-12 text-sm text-[color:var(--color-foreground)]/60">
        プラン変更やプロフィール編集、ログアウト機能は後続ステップで追加予定。
      </p>
    </div>
  );
}
