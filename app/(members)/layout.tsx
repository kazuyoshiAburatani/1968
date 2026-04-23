// 会員画面（準会員・正会員共通）のレイアウト枠。現時点ではパススルー。
// TODO フェーズ2で以下を実装する。
//   1. Supabase Auth でセッション取得、未ログインなら /login へリダイレクト
//   2. users.membership_rank を参照し、guest なら /register へ誘導
//   3. サイドナビ（ホーム／掲示板／マイページ等）の共通表示
export default function MembersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
