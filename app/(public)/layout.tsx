// 公開画面（未ログイン）のレイアウト枠。現時点ではパススルー。
// 将来、ヒーロー背景や告知バナーなど公開向け共通UIを差し込む予定。
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
