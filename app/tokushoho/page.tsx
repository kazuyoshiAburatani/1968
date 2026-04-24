import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表示",
};

export default function TokushohoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">特定商取引法に基づく表示</h1>
      <dl className="mt-8 grid grid-cols-[8rem_1fr] gap-y-4 gap-x-6 text-sm">
        <dt className="font-bold text-foreground/70">販売事業者</dt>
        <dd>油谷和好</dd>

        <dt className="font-bold text-foreground/70">所在地</dt>
        <dd>
          〒542-0081
          <br />
          大阪府大阪市中央区南船場3丁目2番22号
          <br />
          おおきに南船場ビル205
        </dd>

        <dt className="font-bold text-foreground/70">電話番号</dt>
        <dd>
          072-200-3799
          <br />
          <span className="text-xs text-foreground/60">
            ※お問い合わせは基本的にメールにてお願いいたします
          </span>
        </dd>

        <dt className="font-bold text-foreground/70">メール</dt>
        <dd>
          <a href="mailto:support@1968.love">support@1968.love</a>
        </dd>

        <dt className="font-bold text-foreground/70">販売価格</dt>
        <dd>
          正会員、月額480円／年額4,800円（税込）
          <br />
          <span className="text-xs text-foreground/60">
            無料会員は課金なし、登録のみでご利用いただけます
          </span>
        </dd>

        <dt className="font-bold text-foreground/70">支払方法</dt>
        <dd>クレジットカード決済（Stripe）</dd>

        <dt className="font-bold text-foreground/70">支払時期</dt>
        <dd>お申込時に初回決済、その後は月額または年額で自動更新</dd>

        <dt className="font-bold text-foreground/70">サービス提供時期</dt>
        <dd>決済完了直後からご利用いただけます</dd>

        <dt className="font-bold text-foreground/70">解約</dt>
        <dd>
          マイページからいつでも解約できます。解約後も契約期間中はサービスをご利用いただけます。
        </dd>

        <dt className="font-bold text-foreground/70">返金</dt>
        <dd>
          原則として返金は行っておりません。虚偽申告が発覚した場合は返金なく退会処分となります。
        </dd>
      </dl>

      <p className="mt-10 text-sm">
        <Link href="/">← トップへ戻る</Link>
      </p>
    </div>
  );
}
