import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";

// 会員画面（準会員・正会員・pending 共通）のレイアウト。
// 未ログイン → /login、プロフィール未作成 → /onboarding にリダイレクト。
// ランク別の投稿権限はフェーズ3の掲示板機能で個別に制御する。
export default async function MembersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireSession();

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
