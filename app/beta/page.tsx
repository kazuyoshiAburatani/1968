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
        <div className="rounded-2xl border border-primary/30 bg-background p-10 shadow-sm">
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
    <div className="bg-background text-foreground">
      {/* ヒーロー */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4 py-16 sm:py-20">
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <p className="text-xs tracking-widest text-foreground/60 uppercase mb-4">
            Beta Tester Recruiting
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            昭和43年生まれだけの、
            <br />
            <span className="text-primary">ベータテスター30名募集中</span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl mb-8 text-foreground/80 leading-relaxed">
            正会員プラン（通常 月480円）を、
            <br />
            <span className="font-bold text-primary">1年間無料</span>
            でご利用いただけます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#application-form"
              className="inline-flex items-center justify-center bg-primary text-white px-8 py-4 rounded-full text-lg font-bold hover:opacity-90 active:opacity-90 transition-opacity min-w-[240px] no-underline"
            >
              応募フォームへ →
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center border-2 border-primary text-primary bg-background px-8 py-3.5 rounded-full text-lg font-bold hover:bg-primary hover:text-white active:opacity-90 transition-colors min-w-[240px] no-underline"
            >
              サービスを見る
            </Link>
          </div>
        </div>
      </section>

      {/* 1968 とは */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            1968 とは
          </h2>
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-background p-6 sm:p-8 rounded-2xl shadow-sm border border-border text-center">
              <div className="text-5xl sm:text-6xl mb-4" aria-hidden>
                🤝
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3">
                同い年だけが入れる
              </h3>
              <p className="text-sm text-foreground/80 leading-7">
                1968年生まれ限定の会員制コミュニティ。
                <br />
                同世代だからこそ分かり合える特別な空間です。
              </p>
            </div>
            <div className="bg-background p-6 sm:p-8 rounded-2xl shadow-sm border border-border text-center">
              <div className="text-5xl sm:text-6xl mb-4" aria-hidden>
                💬
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3">
                12カテゴリで本音
              </h3>
              <p className="text-sm text-foreground/80 leading-7">
                趣味、仕事、家族、健康など12 の話題で
                <br />
                本音でつながれるコミュニティです。
              </p>
            </div>
            <div className="bg-background p-6 sm:p-8 rounded-2xl shadow-sm border border-border text-center">
              <div className="text-5xl sm:text-6xl mb-4" aria-hidden>
                🛡
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3">
                本人確認で安心
              </h3>
              <p className="text-sm text-foreground/80 leading-7">
                身分証による本人確認で、安心して
                <br />
                交流できる環境を提供しています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ベータ特典 */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            ベータ特典
          </h2>
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <div className="border-2 border-primary p-6 sm:p-8 rounded-2xl bg-primary/5">
              <p className="text-xs text-foreground/60">特典 1</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-2 mb-3 text-primary">
                正会員プラン 1年間無料
              </h3>
              <p className="text-sm sm:text-base text-foreground/80 leading-7">
                通常月額 480 円・年額 4,800 円の正会員プランを 1
                年間無料でご利用いただけます。総額 5,760 円相当の特典です。
              </p>
            </div>
            <div className="border-2 border-accent p-6 sm:p-8 rounded-2xl bg-accent/5">
              <p className="text-xs text-foreground/60">特典 2</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-2 mb-3 text-accent">
                機能改善への声を直接届けられる
              </h3>
              <p className="text-sm sm:text-base text-foreground/80 leading-7">
                ベータテスターとして、サービスの改善提案や新機能のアイデアを直接運営に届けることができます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 応募条件 */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            応募条件
          </h2>
          <div className="bg-background p-6 sm:p-8 rounded-2xl shadow-sm border border-border">
            <ul className="space-y-5">
              {[
                "1968年1月1日〜12月31日生まれの方",
                "同い年と会話を楽しみたい方",
                "サービスを一緒に育てたい方",
                "不具合報告や意見をいただける方",
              ].map((cond) => (
                <li key={cond} className="flex items-start gap-4">
                  <span
                    className="text-emerald-600 text-xl shrink-0 mt-0.5"
                    aria-hidden
                  >
                    ✅
                  </span>
                  <p className="text-base sm:text-lg leading-7">{cond}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 応募の流れ */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            応募の流れ
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: 1, title: "応募", time: "3〜5分", desc: "このページのフォームから応募" },
              { num: 2, title: "確認", time: "3〜5営業日", desc: "運営が内容を確認" },
              { num: 3, title: "招待", time: "5分", desc: "招待メールから会員登録" },
              { num: 4, title: "利用開始", time: "1年間", desc: "正会員として全機能を無料で利用" },
            ].map((step) => (
              <li key={step.num} className="text-center">
                <div className="bg-primary text-white size-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{step.title}</h3>
                <span className="inline-block bg-accent/10 px-3 py-1 rounded-full text-xs font-bold text-accent mb-3">
                  {step.time}
                </span>
                <p className="text-sm text-foreground/80 leading-7">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 応募フォーム */}
      <section className="py-16 px-4 scroll-mt-4" id="application-form">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            応募フォーム
          </h2>

          {error && (
            <div className="mb-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-sm text-red-900">
              {decodeURIComponent(error)}
            </div>
          )}

          <form
            action={submitBetaApplication}
            className="bg-background p-6 sm:p-8 rounded-2xl shadow-sm border border-border space-y-6"
          >
            {/* honeypot */}
            <input
              type="text"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
            />

            <div>
              <label className="block text-base sm:text-lg font-bold mb-2">
                お名前 <span className="text-red-700">*</span>
              </label>
              <p className="text-xs text-foreground/60 mb-2">
                本名でなくてもかまいません
              </p>
              <input
                type="text"
                name="name"
                required
                maxLength={60}
                className="w-full p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
                placeholder="例、油谷 和好"
              />
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold mb-2">
                メールアドレス <span className="text-red-700">*</span>
              </label>
              <p className="text-xs text-foreground/60 mb-2">
                ご連絡先として使用します
              </p>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
                placeholder="example@example.com"
              />
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold mb-2">
                生年月日 <span className="text-red-700">*</span>
              </label>
              <p className="text-xs text-foreground/60 mb-2">
                1968 年生まれの方のみご応募いただけます
              </p>
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value="1968年"
                  className="p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-muted/40 w-24 sm:w-28 text-center"
                  readOnly
                />
                <select
                  name="birth_month"
                  required
                  defaultValue=""
                  className="flex-1 p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
                >
                  <option value="" disabled>月を選択</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}月
                    </option>
                  ))}
                </select>
                <select
                  name="birth_day"
                  required
                  defaultValue=""
                  className="flex-1 p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
                >
                  <option value="" disabled>日を選択</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}日
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold mb-2">
                都道府県（任意）
              </label>
              <select
                name="prefecture"
                defaultValue=""
                className="w-full p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
              >
                <option value="">選択しない</option>
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold mb-2">
                SNS アカウントなど（任意）
              </label>
              <p className="text-xs text-foreground/60 mb-2">
                本人確認の参考にさせていただきます
              </p>
              <input
                type="text"
                name="sns_handle"
                maxLength={100}
                className="w-full p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
                placeholder="例、X @username、Instagram @username"
              />
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold mb-2">
                応募動機（任意・800 字以内）
              </label>
              <textarea
                name="motivation"
                rows={5}
                maxLength={800}
                className="w-full p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg h-32 resize-none bg-background"
                placeholder="1968 年生まれの仲間と交流したい理由や、サービスに期待することをお聞かせください。"
              />
            </div>

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

            <SubmitButton
              className="w-full py-4 text-lg sm:text-xl"
              pendingText="送信中…"
            >
              応募する
            </SubmitButton>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            よくあるご質問
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group border border-border rounded-2xl bg-background open:shadow-sm"
              >
                <summary className="cursor-pointer list-none p-5 sm:p-6 text-base sm:text-lg font-bold flex justify-between items-center gap-4 hover:bg-muted/30 rounded-2xl">
                  <span>{faq.q}</span>
                  <span
                    aria-hidden
                    className="text-2xl text-foreground/60 group-open:rotate-45 transition-transform shrink-0"
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base text-foreground/80 leading-7">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* フッター案内 */}
      <section className="py-12 px-4 bg-foreground text-background">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-2xl font-bold tracking-wider mb-4">1968</p>
          <div className="space-y-2 text-sm opacity-80">
            <p>運営、油谷和好</p>
            <p>
              お問い合わせ、
              <a href="mailto:support@1968.love" className="underline">
                support@1968.love
              </a>
            </p>
            <div className="flex justify-center gap-6 mt-4 flex-wrap">
              <Link
                href="/terms"
                className="hover:text-primary transition-colors text-background"
                target="_blank"
              >
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="hover:text-primary transition-colors text-background"
                target="_blank"
              >
                プライバシーポリシー
              </Link>
              <Link
                href="/tokushoho"
                className="hover:text-primary transition-colors text-background"
                target="_blank"
              >
                特定商取引法
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const FAQS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "本当に無料ですか？",
    a: "ベータ期間中、および正式公開後 12 ヶ月、正会員プランを無料でご利用いただけます。クレジットカードの登録も不要です。期間終了後、継続するかは自由にお選びいただけます。",
  },
  {
    q: "1968 年生まれかどうかは、どう確認するのですか？",
    a: "会員登録時にご記入いただく生年月日に加え、サービス内で身分証（マイナンバーカード・運転免許証・パスポート・健康保険証のいずれか）の画像を提出いただきます。画像は確認後 30 日以内に完全削除されます。",
  },
  {
    q: "顔出しや本名は必要ですか？",
    a: "必要ありません。プロフィールはニックネーム制で、写真も任意です。",
  },
  {
    q: "パソコンに詳しくないのですが、使えますか？",
    a: "スマートフォンで操作できます。文字も大きく、画面も分かりやすく作っています。",
  },
  {
    q: "応募を取り下げたい場合は？",
    a: (
      <>
        <a href="mailto:support@1968.love" className="underline">
          support@1968.love
        </a>{" "}
        までお気軽にご連絡ください。
      </>
    ),
  },
  {
    q: "1968 年以外の生まれですが、家族のために応募できますか？",
    a: "申し訳ございません、本サービスはご本人が 1968 年生まれの方のみご利用いただけます。代理での申し込みはご遠慮ください。",
  },
  {
    q: "応募すれば必ず参加できますか？",
    a: "ベータ期間中は人数を絞ってご招待しています。お申し込みの順序や、活動内容を拝見して順次ご案内します。あらかじめご了承ください。",
  },
];
