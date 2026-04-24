import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約",
};

// 利用規約のスタブ、フェーズ9（法務対応）で正式文書に置き換え。
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">利用規約</h1>
      <p className="mt-4 text-foreground/80">
        現在、弁護士の確認を経た正式な利用規約を準備中です。2026年の正式公開までにこちらに掲載します。
      </p>

      <section className="mt-10 space-y-4 text-sm text-foreground/80">
        <h2 className="font-bold text-base">運用上、以下の行為は禁止とします</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>虚偽の生年月日による登録、虚偽申告発覚時は返金なく退会処分</li>
          <li>政治・宗教・陰謀論の投稿</li>
          <li>恋愛目的・交際相手探しの利用</li>
          <li>商品宣伝・営業目的の投稿</li>
          <li>金銭貸借、投資勧誘、宗教勧誘</li>
          <li>他の会員を揶揄する、誹謗中傷する表現</li>
        </ul>
      </section>

      <p className="mt-10 text-sm">
        お問い合わせは{" "}
        <a href="mailto:support@1968.love">support@1968.love</a> まで。
      </p>
      <p className="mt-4 text-sm">
        <Link href="/">← トップへ戻る</Link>
      </p>
    </div>
  );
}
