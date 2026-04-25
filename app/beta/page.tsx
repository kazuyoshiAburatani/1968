import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/submit-button";
import { PREFECTURES } from "@/lib/prefectures";
import { submitBetaApplication } from "./actions";

export const metadata: Metadata = {
  title: "ベータテスター募集",
  description:
    "1968 ベータ版にご参加いただける方を募集しています。1968年生まれ限定の会員制コミュニティを、一緒に育てていただけませんか。",
};

type Props = {
  searchParams: Promise<{ submitted?: string; error?: string }>;
};

export default async function BetaPage({ searchParams }: Props) {
  const { submitted, error } = await searchParams;

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-primary/30 bg-muted/40 p-10">
          <p className="text-sm text-foreground/60">受付完了</p>
          <h1 className="mt-2 text-2xl font-bold">
            ご応募ありがとうございました。
          </h1>
          <p className="mt-4 text-sm text-foreground/80 leading-7">
            内容を確認のうえ、3〜5 営業日を目処に、ご登録いただいたメールアドレスへご連絡いたします。
            <br />
            楽しみにお待ちください。
          </p>
          <p className="mt-6 text-xs text-foreground/60">
            メールが届かない場合は、迷惑メールフォルダもご確認のうえ、{" "}
            <a href="mailto:support@1968.love" className="underline">
              support@1968.love
            </a>{" "}
            までお問い合わせください。
          </p>
        </div>
        <p className="mt-8 text-sm">
          <Link href="/">← トップへ戻る</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      {/* ヒーロー */}
      <header className="text-center">
        <p className="text-xs tracking-widest text-foreground/60 uppercase">
          Beta Tester Recruiting
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          1968 ベータ版に
          <br className="sm:hidden" />
          ご参加いただける方を
          <br />
          募集しています。
        </h1>
        <p className="mt-6 text-base text-foreground/80 leading-8">
          1968年生まれ限定の、小さな会員制コミュニティ。
          <br className="hidden sm:inline" />
          ベータ期間中の特典として、正式公開後の{" "}
          <strong className="text-primary">正会員プラン（通常 月額480円）を、1年間無料</strong>
          でご提供します。
        </p>
      </header>

      {/* 1968 とは */}
      <section className="mt-14">
        <h2 className="text-lg font-bold">1968 とは</h2>
        <p className="mt-3 text-sm text-foreground/85 leading-7">
          1968年（昭和43年）生まれの方だけが参加できる、招待制に近い小さなコミュニティです。
          同い年だけが集まる安心感のなかで、介護・夫婦・健康・お金など、人には聞きにくい話題から、
          昭和の懐かしい思い出まで、本音で語り合える場を目指しています。
        </p>
      </section>

      {/* 募集対象 */}
      <section className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="text-lg font-bold">こんな方にぴったりです</h2>
        <ul className="mt-4 space-y-3 text-sm text-foreground/85 leading-7">
          <li className="flex gap-3">
            <span aria-hidden className="text-primary">●</span>
            <span>1968年（昭和43年）1月1日〜12月31日のあいだに生まれた方</span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-primary">●</span>
            <span>同い年とゆっくり会話を楽しみたい方</span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-primary">●</span>
            <span>新しいサービスを一緒に育てることに興味がある方</span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-primary">●</span>
            <span>不具合の報告や改善のご意見を、率直にお寄せいただける方</span>
          </li>
        </ul>
      </section>

      {/* 特典 */}
      <section className="mt-12">
        <h2 className="text-lg font-bold">ベータテスターの特典</h2>
        <ul className="mt-4 grid sm:grid-cols-2 gap-4">
          <li className="rounded-xl border border-primary/30 bg-muted/40 p-5">
            <p className="text-xs text-foreground/60">特典 1</p>
            <p className="mt-1 font-bold">
              正会員プラン
              <br />
              <span className="text-primary text-2xl">1年間 無料</span>
            </p>
            <p className="mt-2 text-xs text-foreground/70">
              通常 月額480円・年額4,800円のところ、ベータ参加から正式公開後 12ヶ月間、無料でご利用いただけます。
            </p>
          </li>
          <li className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-xs text-foreground/60">特典 2</p>
            <p className="mt-1 font-bold">
              全カテゴリ自由に利用
            </p>
            <p className="mt-2 text-xs text-foreground/70">
              アニメ・歌謡曲・駄菓子から、暮らし・家族・お金まで、12 カテゴリすべてで投稿・閲覧・いいね・通報・DM がご利用いただけます。
            </p>
          </li>
          <li className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-xs text-foreground/60">特典 3</p>
            <p className="mt-1 font-bold">運営への直接フィードバック</p>
            <p className="mt-2 text-xs text-foreground/70">
              使ってみての気づき、改善のご要望を、運営に直接お届けいただけます。サービスの方向性に関わっていただけます。
            </p>
          </li>
          <li className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-xs text-foreground/60">特典 4</p>
            <p className="mt-1 font-bold">創設メンバー記念バッジ</p>
            <p className="mt-2 text-xs text-foreground/70">
              ベータ期間中にご参加いただいた方には、プロフィールに「創設メンバー」表示を予定しています（仕様検討中）。
            </p>
          </li>
        </ul>
      </section>

      {/* カテゴリ紹介 */}
      <section className="mt-12">
        <h2 className="text-lg font-bold">こんな話題を語り合います</h2>
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            "アニメ・特撮の名作",
            "歌謡曲・あの頃の音楽",
            "テレビ・ドラマの記憶",
            "駄菓子・給食・あの味",
            "子供の頃の遊び",
            "死語・流行語",
            "学校生活・先生・部活",
            "バブル・社会人デビュー",
            "今の暮らし・健康のこと",
            "家族のはなし",
            "仕事・お金・老後の設計",
            "オフ会・集まり",
          ].map((label) => (
            <li
              key={label}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground/85"
            >
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* 申し込みフォーム */}
      <section className="mt-14">
        <h2 className="text-lg font-bold">応募フォーム</h2>
        <p className="mt-2 text-sm text-foreground/70">
          以下の内容で受け付けます。所要時間は 1〜2 分です。
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-sm text-red-900">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={submitBetaApplication} className="mt-6 space-y-6">
          {/* honeypot, bot 対策。視覚的に隠す */}
          <input
            type="text"
            name="website"
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
          />

          <Field label="お名前" required hint="本名でなくてもかまいません（運営連絡用）">
            <input
              type="text"
              name="name"
              required
              maxLength={60}
              className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
              placeholder="例、油谷 和好"
            />
          </Field>

          <Field label="メールアドレス" required hint="ご連絡先として使用します">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
              placeholder="example@example.com"
            />
          </Field>

          <Field label="お誕生日" required hint="1968年生まれの方のみご応募いただけます">
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground/70">1968年</span>
              <select
                name="birth_month"
                required
                className="min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
                defaultValue=""
              >
                <option value="" disabled>月</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
              <select
                name="birth_day"
                required
                className="min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
                defaultValue=""
              >
                <option value="" disabled>日</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}日
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="お住まいの都道府県" hint="任意">
            <select
              name="prefecture"
              defaultValue=""
              className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
            >
              <option value="">選択しない</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="SNS アカウントなど" hint="任意、本人確認の参考にさせていただきます">
            <input
              type="text"
              name="sns_handle"
              maxLength={100}
              className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
              placeholder="例、X @username、Instagram @username、Facebook URL"
            />
          </Field>

          <Field label="応募動機・期待することなど" hint="任意・800文字まで">
            <textarea
              name="motivation"
              rows={5}
              maxLength={800}
              className="w-full px-3 py-2 rounded border border-border bg-background"
              placeholder="同い年と話したい、こんな話題で盛り上がりたい、こんな機能があると嬉しい、など。"
            />
          </Field>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="agree_terms"
              required
              className="mt-1 size-5"
            />
            <span>
              <Link href="/terms" className="underline" target="_blank">
                利用規約
              </Link>
              および{" "}
              <Link href="/privacy" className="underline" target="_blank">
                プライバシーポリシー
              </Link>
              に同意します
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <SubmitButton pendingText="送信中…">この内容で応募する</SubmitButton>
            <Link
              href="/"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-border no-underline hover:bg-muted"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </section>

      {/* FAQ */}
      <section className="mt-16 border-t border-border pt-10">
        <h2 className="text-lg font-bold">よくあるご質問</h2>
        <dl className="mt-4 space-y-5 text-sm text-foreground/85 leading-7">
          <div>
            <dt className="font-bold">Q. 応募すれば必ず参加できますか？</dt>
            <dd className="mt-1">
              ベータ期間中は人数を絞ってご招待しています。お申し込みの順序や、活動内容を拝見して順次ご案内します。あらかじめご了承ください。
            </dd>
          </div>
          <div>
            <dt className="font-bold">Q. 1年間無料の特典は本当に何もかかりませんか？</dt>
            <dd className="mt-1">
              はい、クレジットカードの登録も不要です。1年経過後、引き続きご利用いただく場合のみ、月額480円もしくは年額4,800円のお手続きをご案内します。
            </dd>
          </div>
          <div>
            <dt className="font-bold">Q. 1968年以外の生まれですが、家族のために応募できますか？</dt>
            <dd className="mt-1">
              申し訳ございません、本サービスはご本人が1968年生まれの方のみご利用いただけます。代理での申し込みはご遠慮ください。
            </dd>
          </div>
          <div>
            <dt className="font-bold">Q. 個人情報の取り扱いは？</dt>
            <dd className="mt-1">
              <Link href="/privacy" className="underline">
                プライバシーポリシー
              </Link>
              に従い、ベータ運営および採用判断のためのみに使用します。第三者への提供は行いません。
            </dd>
          </div>
          <div>
            <dt className="font-bold">Q. ベータ期間はいつまで？</dt>
            <dd className="mt-1">
              現在、2026年内を目処にベータ運用、その後正式公開を予定しています。ベータテスターの方の特典（1年間無料）は、正式公開からの起算となります。
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-12 text-sm text-center">
        <Link href="/">← トップへ戻る</Link>
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-medium">
        {label}
        {required && <span className="ml-1 text-sm text-red-700">*</span>}
      </span>
      {hint && (
        <span className="block text-xs text-foreground/60 mb-2 mt-0.5">
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}
