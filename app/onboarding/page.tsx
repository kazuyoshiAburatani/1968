import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";

// オンボーディング、/auth/callback 後に profile 未作成のユーザーが案内される画面。
// フル実装はステップ2.10で行い、現時点は認証フローの目視確認用のスタブ。
export default async function OnboardingPage() {
  const { supabase, user } = await requireSession();

  // 既にプロフィールを作成済みなら /mypage に戻す
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) {
    redirect("/mypage");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">プロフィール作成</h1>
      <p className="mt-2">
        1968 へようこそ。続いてプロフィールを入力してください。
      </p>
      <p className="mt-2 text-sm text-[color:var(--color-foreground)]/70">
        メール、{user.email}
      </p>

      <div className="mt-8 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 p-6">
        <p className="text-sm">
          （プロフィール入力フォームは次のステップで実装します）
        </p>
      </div>
    </div>
  );
}
