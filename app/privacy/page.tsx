import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
      <p className="mt-4 text-foreground/80">
        現在、弁護士の確認を経た正式なプライバシーポリシーを準備中です。2026年の正式公開までにこちらに掲載します。
      </p>

      <section className="mt-10 space-y-4 text-sm text-foreground/80">
        <h2 className="font-bold text-base">取得する情報</h2>
        <ul className="space-y-1 list-disc pl-5">
          <li>メールアドレス、ニックネーム、生年月日、お住まいの都道府県など会員登録時に入力いただく情報</li>
          <li>正会員の方は、身分証画像（本人確認用、確認後30日以内に完全削除）</li>
          <li>クレジットカード情報（Stripe が保持、当サイトは保存しません）</li>
          <li>アクセスログ、IPアドレス、UserAgent などの技術情報</li>
        </ul>

        <h2 className="font-bold text-base mt-6">利用目的</h2>
        <ul className="space-y-1 list-disc pl-5">
          <li>本サービスの提供および運営</li>
          <li>本人確認および年齢確認</li>
          <li>不正利用の防止</li>
          <li>サポート対応</li>
        </ul>

        <h2 className="font-bold text-base mt-6">第三者提供</h2>
        <p>
          法令に基づく場合や本人の同意がある場合を除き、取得した個人情報を第三者に提供することはありません。
        </p>
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
