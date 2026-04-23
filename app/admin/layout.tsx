// 管理画面 /admin/* の共通レイアウト枠。現時点ではパススルー。
// TODO フェーズ6で以下を実装する。
//   1. admins テーブルで認可チェック、未認可は 404 相当を返す
//   2. 全アクセスを audit_logs に記録するミドルウェアを適用
//   3. 管理画面用ナビ（会員管理／身分証確認／通報／お題／ダッシュボード）の共通表示
//   4. 二段階認証（MFA）未設定の管理者は設定画面に強制誘導
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
