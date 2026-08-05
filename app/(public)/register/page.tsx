import { permanentRedirect } from "next/navigation";

// 旧「新規登録」画面。
// メールアドレスとパスワードを求める登録は撤去したため、30 秒登録へ恒久転送する。
// 検索結果や外部リンクから /register に来る人が迷子にならないよう、ページ自体は残す。
export default function RegisterRedirectPage() {
  permanentRedirect("/join");
}
