import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表示",
};

// 完全無料化以降、有料プランは廃止し、サービスはすべて無料提供。
// 唯一の決済は任意の「年次応援団」（一回 3,000 円）。
// 本ページは応援団に関する事業者情報・解約条件等を掲載する。
export default function TokushohoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">特定商取引法に基づく表示</h1>

      <p className="mt-4 text-sm text-foreground/70">
        最終更新日、2026年5月4日
      </p>

      <p className="mt-3 text-sm text-foreground/80 leading-7">
        本サービス「1968」は、すべての機能を無料でご利用いただけます。
        唯一の有償取引は、運営を任意で支援するための「
        <strong>年次応援団</strong>」（一回 3,000 円）です。
        以下、応援団のお支払いに関する特定商取引法上の表示を行います。
      </p>

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

        <dt className="font-bold text-foreground/70">販売商品</dt>
        <dd>
          年次応援団称号、3,000 円（税込）／回
          <br />
          <span className="text-xs text-foreground/60">
            お支払いいただいた年限定の「○○○○年応援団」称号と、応援団ラウンジへのアクセス権が付与されます。機能差はありません、純粋な運営応援のためのお支払いです。
          </span>
        </dd>

        <dt className="font-bold text-foreground/70">支払方法</dt>
        <dd>クレジットカード決済（Stripe）</dd>

        <dt className="font-bold text-foreground/70">支払時期</dt>
        <dd>
          お申込時に決済（一回払い）。サブスクリプションではなく、自動更新されません。
        </dd>

        <dt className="font-bold text-foreground/70">称号付与時期</dt>
        <dd>決済完了後、即時に称号とラウンジアクセス権が付与されます。</dd>

        <dt className="font-bold text-foreground/70">称号有効期間</dt>
        <dd>
          お支払いをいただいた暦年（日本時間 1月1日〜12月31日）の間。年が切り替わると次年度の称号は別途お支払いをいただいた場合に付与されます。
        </dd>

        <dt className="font-bold text-foreground/70">返金</dt>
        <dd>
          性質上、原則として返金は行っておりません。称号付与後の取り消しはできません。
          <br />
          ただし当方の責に帰すべき重大な不具合等によりサービスがご利用いただけない場合は個別にご相談ください。
        </dd>

        <dt className="font-bold text-foreground/70">解約</dt>
        <dd>
          応援団は単発の支払いのため、解約手続きは不要です。次年度に支援なさらない場合は何もしていただく必要はありません。
        </dd>

        <dt className="font-bold text-foreground/70">動作環境</dt>
        <dd>
          最新版のブラウザ（Chrome、Safari、Firefox、Edge）でのご利用を推奨します。スマートフォン・タブレット・パソコンに対応しています。
        </dd>

        <dt className="font-bold text-foreground/70">特別条件</dt>
        <dd>
          本サービスは 1968 年生まれの方に限定して提供しています。生年月日に関する虚偽の申告が判明した場合、応援団のお支払いを含めた返金なく退会処分となります。
        </dd>
      </dl>

      <p className="mt-10 text-sm">
        ご不明な点は{" "}
        <a href="mailto:support@1968.love">support@1968.love</a> までお問い合わせください。
      </p>
      <p className="mt-4 text-sm">
        <Link href="/">← トップへ戻る</Link>
      </p>
    </div>
  );
}
