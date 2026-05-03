import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

// プライバシーポリシーのドラフト、弁護士による最終レビュー前。フェーズ9（法務対応）で確定版に置き換える。
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">プライバシーポリシー</h1>

      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-bold">本文書はドラフトです</p>
        <p className="mt-1">
          現在、弁護士による正式な確認を経た最終版を準備中です。2026年の正式公開までに本ページを更新します。
        </p>
      </div>

      <p className="mt-6 text-sm text-foreground/70">
        最終更新日、2026年5月4日（ドラフト）
      </p>

      <Section title="1. 事業者情報">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 gap-x-4">
          <dt className="text-foreground/70">事業者</dt>
          <dd>油谷和好</dd>
          <dt className="text-foreground/70">所在地</dt>
          <dd>
            〒542-0081
            <br />
            大阪府大阪市中央区南船場3丁目2番22号
            <br />
            おおきに南船場ビル205
          </dd>
          <dt className="text-foreground/70">連絡先</dt>
          <dd>
            <a href="mailto:support@1968.love">support@1968.love</a>
          </dd>
        </dl>
      </Section>

      <Section title="2. 取得する個人情報の項目">
        <p>
          当方は、本サービスの提供にあたり、以下の個人情報を取得します。
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <span className="font-medium">登録時に取得する情報</span>、メールアドレス、パスワード（暗号化保管）、ニックネーム、生年月日、性別（任意）、お住まいの都道府県（任意）
          </li>
          <li>
            <span className="font-medium">プロフィール情報</span>、出身地、卒業校、職業、自己紹介文、プロフィール画像など、会員ご自身が入力された情報
          </li>
          <li>
            <span className="font-medium">1968 認証情報</span>、誕生月日、誓約への同意、ご自身が記述された「1968 年生まれの記憶」（200 字程度の自由記述）、署名としてタイプされたニックネーム。身分証画像の取得は行いません
          </li>
          <li>
            <span className="font-medium">決済関連情報</span>、任意の応援団お支払いをいただいた場合、決済代行事業者（Stripe Inc.）のお客様ID、お支払い年・金額等の最小限の情報。クレジットカード番号、有効期限、セキュリティコード等のカード情報は当方のサーバには一切保存されず、Stripe側で管理されます
          </li>
          <li>
            <span className="font-medium">投稿コンテンツ</span>、掲示板への投稿、返信、いいね履歴、ダイレクトメッセージの内容、添付した画像・動画
          </li>
          <li>
            <span className="font-medium">アクセス情報</span>、IPアドレス、ブラウザの種類、UserAgent、アクセス日時、リファラ、ログインの試行履歴
          </li>
          <li>
            <span className="font-medium">問い合わせ情報</span>、お問い合わせ時にご記入いただいたお名前、内容
          </li>
        </ul>
      </Section>

      <Section title="3. 取得方法">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            会員登録、プロフィール登録、1968 認証申請、投稿等、会員ご自身による入力または送信により取得します。
          </li>
          <li>
            アクセス情報、行動分析情報（後述）は、ブラウザから自動的に当方および解析事業者のサーバに送信される技術情報として取得します。
          </li>
          <li>
            応援団お支払いをいただいた場合の決済情報は、決済代行事業者を経由して、当方が取り扱える範囲（顧客ID、お支払い年・金額等）で取得します。
          </li>
        </ul>
      </Section>

      <Section title="4. 利用目的">
        <p>取得した個人情報は、以下の目的で利用します。</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>本サービスの提供、運営、維持</li>
          <li>会員資格（生年月日要件）の確認、本人確認</li>
          <li>会員間のコミュニケーション機能の提供</li>
          <li>
            会員ランクに応じた利用権限の管理、料金の請求、決済処理
          </li>
          <li>不正利用、なりすまし、規約違反行為の検知および対応</li>
          <li>サポート対応、お問い合わせへの回答</li>
          <li>
            重要なお知らせ、サービス変更通知、利用規約変更通知などの送信
          </li>
          <li>
            サービス改善、新機能の検討のための統計分析（個人を特定できない形に加工）
          </li>
          <li>法令に基づく対応、当方の権利または財産の保護</li>
        </ul>
      </Section>

      <Section title="5. 1968 認証情報の取り扱い">
        <p>
          1968 認証は、誓約と「1968 年生まれの記憶」の自由記述に基づきます。身分証画像の取得は行いません。記述いただいた内容は以下のとおり取り扱います。
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            審査時の閲覧者は、当方が指名した認証担当者のみです。
          </li>
          <li>
            記述された内容自体はプロフィールには公開されず、認証審査用のみに使用されます。
          </li>
          <li>
            承認・却下後も、申請の存在・日時・状態のメタデータは監査ログとして保持します。
          </li>
          <li>
            1968 認証以外の目的では利用せず、第三者に提供することもありません。
          </li>
        </ul>
      </Section>

      <Section title="6. 第三者提供">
        <p>
          当方は、以下のいずれかに該当する場合を除き、取得した個人情報を第三者に提供しません。
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>会員ご本人の同意がある場合</li>
          <li>法令に基づく場合（裁判所の令状、捜査機関からの照会等）</li>
          <li>
            人の生命、身体または財産の保護のために必要があり、本人の同意を得ることが困難な場合
          </li>
          <li>
            公衆衛生の向上または児童の健全育成の推進のため特に必要があり、本人の同意を得ることが困難な場合
          </li>
          <li>
            国の機関または地方公共団体が法令の定める事務を遂行することに対し協力する必要がある場合
          </li>
        </ul>
      </Section>

      <Section title="7. 業務委託">
        <p>
          当方は、本サービスの提供および運営にあたり、以下のとおり個人情報の取り扱いを外部の事業者に委託することがあります。委託先には、本ポリシーと同等以上の安全管理措置を講じることを契約上義務づけます。
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <span className="font-medium">Supabase（米国）</span>、データベース、認証、ファイルストレージ
          </li>
          <li>
            <span className="font-medium">Vercel（米国）</span>、Webサイトのホスティングおよび配信
          </li>
          <li>
            <span className="font-medium">Stripe（米国）</span>、応援団お支払いの決済処理（任意の場合のみ）
          </li>
          <li>
            <span className="font-medium">Resend（米国）</span>、メール配信
          </li>
          <li>
            <span className="font-medium">Cloudflare（米国）</span>、コンテンツ配信ネットワーク、セキュリティ
          </li>
          <li>
            <span className="font-medium">Sentry（米国）</span>、エラー監視
          </li>
          <li>
            <span className="font-medium">Microsoft Clarity（米国）</span>、ヒートマップ・操作録画によるユーザー行動分析（個人特定不可、IP は匿名化）
          </li>
          <li>
            <span className="font-medium">Google Analytics 4（米国）</span>、アクセス解析（IP 匿名化を有効化）
          </li>
        </ul>
        <p className="mt-2">
          上記の委託先は外国にある第三者にあたるため、個人情報保護法第28条に基づき、必要な情報を以下のとおり提供します。各国における個人情報保護に関する制度等の詳細は、個人情報保護委員会のウェブサイト（
          <a
            href="https://www.ppc.go.jp/personalinfo/legal/kaiseihogohou/#gaikoku"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            外国における個人情報の保護に関する制度等の調査
          </a>
          ）をご参照ください。委託先各社は、適切な安全管理措置を講じています。
        </p>
      </Section>

      <Section title="8. 共同利用">
        <p>
          現時点では、個人情報の共同利用は行っていません。今後共同利用を行う場合は、改めて本ポリシーに記載するか、会員に通知のうえ実施します。
        </p>
      </Section>

      <Section title="8-2. 匿名加工情報の作成および利用">
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            当方は、保有する個人情報について、個人情報保護法に基づき適切な加工を施したうえで、特定の個人を識別することができず、かつ当該個人情報を復元することができないようにした情報（以下「匿名加工情報」といいます）を作成することがあります。
          </li>
          <li>
            匿名加工情報には、以下の項目が含まれることがあります。
            <ul className="list-disc pl-5 mt-1">
              <li>会員の年齢層、性別、お住まいの地方区分</li>
              <li>本サービスの利用履歴、投稿件数、活動時間帯</li>
              <li>カテゴリ別の利用傾向、人気テーマの集計</li>
              <li>その他、特定の個人を識別できないよう加工された情報項目</li>
            </ul>
          </li>
          <li>
            当方は、匿名加工情報を以下の目的で利用します。
            <ul className="list-disc pl-5 mt-1">
              <li>本サービスの改善および新機能の検討</li>
              <li>1968 年生まれ世代の暮らし、健康、コミュニティに関する統計データの作成および分析</li>
              <li>マーケティングおよび広告配信の最適化</li>
              <li>第8-3項に定める学術研究目的での提供</li>
            </ul>
          </li>
          <li>
            当方は、匿名加工情報を第三者に提供することがあります。この場合、提供する情報の項目および提供の方法を、あらかじめ本ポリシーまたは本サービス内で公表し、提供先において当該情報が匿名加工情報である旨を明示します。
          </li>
          <li>
            当方は、匿名加工情報の安全管理のために必要かつ適切な措置を講じるとともに、当該情報の取り扱いに関する内部規程の整備および従業員教育を行います。
          </li>
        </ol>
      </Section>

      <Section title="8-3. 学術研究目的でのデータ利用">
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            当方は、1968 年生まれ世代の暮らし、健康、コミュニティ、フレイル予防に関する学術研究の推進に貢献することを社会的使命の一つと位置づけ、以下の条件のもとで、匿名加工情報および統計データを学術研究目的に利用することができます。
          </li>
          <li>
            学術研究目的での提供対象は、以下に限定します。
            <ul className="list-disc pl-5 mt-1">
              <li>匿名化された統計データ・集計値（個人を特定しない形式のもの）</li>
              <li>会員の属性情報（年齢層・性別・利用期間等）を匿名化した統計情報</li>
              <li>カテゴリ別の活動傾向、利用時間帯の集計</li>
              <li>個人を特定しない形での感情分析の結果（数値・スコア等）</li>
            </ul>
          </li>
          <li>
            ダイレクトメッセージの本文テキストは、第三者への提供は一切行いません。
          </li>
          <li>
            当方は、以下の条件をすべて満たす研究機関とのみ連携します。
            <ul className="list-disc pl-5 mt-1">
              <li>大学、国立研究開発法人、またはこれらに準ずる公的研究機関であること</li>
              <li>当該研究が、当該研究機関における倫理審査委員会の承認を受けていること</li>
              <li>当該研究機関が個人情報保護法その他関連法令を遵守することを書面で確約していること</li>
              <li>データの解析・管理について当方から独立した体制を有すること</li>
            </ul>
          </li>
          <li>
            会員は、本ポリシー末尾のお問い合わせ窓口を通じて、自身に関するデータの学術研究利用の停止を、いつでも申し出ることができます。当方はこれに応じるものとします。
          </li>
          <li>
            当方は、学術研究目的でのデータ利用を実施する場合、本サービス内またはウェブサイト上で、研究の概要、目的、研究機関名を開示します。
          </li>
        </ol>
      </Section>

      <Section title="9. 安全管理措置">
        <p>
          当方は、取得した個人情報の漏洩、滅失、毀損を防止するため、以下の安全管理措置を講じます。
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <span className="font-medium">組織的</span>、個人情報取扱責任者の設置、取扱権限を持つ担当者の限定、アクセスログの記録
          </li>
          <li>
            <span className="font-medium">人的</span>、業務委託先を含む取扱担当者への教育、機密保持義務
          </li>
          <li>
            <span className="font-medium">物理的</span>、サーバ機器が設置される場所への物理アクセス制限（クラウド事業者の責任範囲）
          </li>
          <li>
            <span className="font-medium">技術的</span>、通信のTLS暗号化、データベースのアクセス権限制御（行レベルセキュリティ）、パスワードのハッシュ保存、機密データの追加暗号化、ログイン試行回数制限、不正アクセス監視、定期的なバックアップ
          </li>
        </ul>
      </Section>

      <Section title="10. 個人情報の保有期間">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            会員に関する個人情報は、原則として会員資格が継続する期間および退会後の必要な期間（紛争対応、法令上の保管義務等）保有します。
          </li>
          <li>
            1968 認証申請の記述内容は、本条第5項に従い保有します。身分証画像の保有はありません。
          </li>
          <li>
            アクセスログは、不正利用の調査および統計分析の目的で、最大1年間保有します。
          </li>
          <li>
            退会された会員の投稿コンテンツについては、利用規約第9条第4項に従い、本サービス上に残存することがあります。
          </li>
        </ul>
      </Section>

      <Section title="11. 開示、訂正、削除等のご請求">
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            会員は、当方に対し、ご自身の個人情報の開示、訂正、追加、削除、利用停止、第三者提供の停止を請求することができます。
          </li>
          <li>
            登録メールアドレス、ニックネーム、プロフィール、公開範囲設定等は、マイページから会員ご自身で確認・変更ができます。
          </li>
          <li>
            上記以外のご請求は、本ポリシー末尾のお問い合わせ窓口までご連絡ください。当方は、ご請求がご本人によるものであることを確認のうえ、合理的な期間内に対応します。
          </li>
        </ol>
      </Section>

      <Section title="12. クッキー（Cookie）および解析ツールの使用">
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            本サービスは、ログイン状態の維持、利便性の向上、サービスの利用状況の把握のためにクッキーを使用します。
          </li>
          <li>
            <span className="font-medium">Microsoft Clarity</span> および{" "}
            <span className="font-medium">Google Analytics 4</span> を、サイト改善のためのアクセス解析に使用しています。これらのツールは、ページ閲覧、クリック位置、スクロール深度、操作録画（Clarity のみ）等を収集します。IP アドレスは匿名化されており、個人を特定する目的では利用しません。
          </li>
          <li>
            Clarity の詳細は{" "}
            <a
              href="https://privacy.microsoft.com/en-us/privacystatement"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Microsoft プライバシーステートメント
            </a>
            、Google Analytics の詳細は{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google のサービスを使用するサイトやアプリから収集した情報の Google による使用
            </a>
            をご参照ください。
          </li>
          <li>
            会員は、ブラウザの設定によりクッキーの受け入れを制限することができますが、その場合本サービスの一部機能が正常に動作しないことがあります。
          </li>
          <li>
            Google Analytics の利用を停止したい場合、{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google アナリティクス オプトアウト アドオン
            </a>
            をご利用いただけます。
          </li>
        </ol>
      </Section>

      <Section title="13. 漏洩等が発生した場合の対応">
        <p>
          個人情報の漏洩、滅失、毀損その他のセキュリティ事故が発生した場合、当方は速やかに事実関係および再発防止策の調査を行い、関係する会員への通知、個人情報保護委員会への報告（要件に該当する場合は72時間以内）、公表など、法令に基づく対応を行います。
        </p>
      </Section>

      <Section title="14. 本ポリシーの変更">
        <p>
          当方は、法令の改正、本サービスの内容変更、その他の事由により、本ポリシーを改定することがあります。改定後の内容は、本サービス上に掲載した時点から効力を生じます。重要な変更の場合は、メール等により会員に通知します。
        </p>
      </Section>

      <Section title="15. お問い合わせ窓口">
        <p>
          個人情報の取り扱いに関するご質問、開示等のご請求、その他のお問い合わせは、以下の窓口までご連絡ください。
        </p>
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4">
          <p>1968 個人情報お問い合わせ窓口</p>
          <p className="mt-1">
            メール、
            <a href="mailto:support@1968.love" className="underline">
              support@1968.love
            </a>
          </p>
          <p className="mt-1 text-xs text-foreground/60">
            お問い合わせはメールにてお願いいたします。電話でのお問い合わせには対応いたしかねます。
          </p>
        </div>
      </Section>

      <p className="mt-10 text-sm">
        <Link href="/">← トップへ戻る</Link>
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 text-sm leading-7 text-foreground/85">
      <h2 className="font-bold text-base text-foreground mb-2">{title}</h2>
      {children}
    </section>
  );
}
