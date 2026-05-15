import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BetaApplicationForm } from "@/components/beta/beta-application-form";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitBetaApplication } from "./actions";

export const metadata: Metadata = {
  title: "ベータテスター募集",
  description:
    "同い年だけで、もう一度本音で話せる場所を。1968 年生まれだけの掲示板「1968」、最初の 30 人を一緒に育ててください。",
  openGraph: {
    title: "同い年だけで、もう一度本音で話せる場所を。| 1968",
    description:
      "1968 年（昭和 43 年）生まれだけの掲示板。最初の 30 人を募集中。創設メンバーに永久特典 8 つ。",
    url: "https://1968.love/beta",
    siteName: "1968",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/og/og-beta.png",
        width: 1200,
        height: 630,
        alt: "ベータテスター30名募集中 | 1968",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ベータテスター30名募集中 | 1968",
    description:
      "1968年生まれ限定コミュニティ「1968」、ベータテスター30名募集中。創設メンバー限定 8 特典。",
    images: ["/og/og-beta.png"],
  },
};

// ベータ募集枠、応募の進捗をリアルタイムに見せて緊急感を出す
const BETA_SLOTS = 30;

type Props = {
  searchParams: Promise<{ submitted?: string; error?: string }>;
};

export default async function BetaPage({ searchParams }: Props) {
  const { submitted, error } = await searchParams;

  // 既存応募数を取得し、残席数を表示する
  const sb = getSupabaseAdminClient();
  const { count } = await sb
    .from("beta_applications")
    .select("id", { count: "exact", head: true });
  const applied = count ?? 0;
  const remaining = Math.max(0, BETA_SLOTS - applied);
  const isFull = remaining === 0;

  // 運営者の顔出し素材、ファイル配置後に自動で表示。
  // 撮影〜配置ガイド、`資料/lp-founder-content/recording-guide.md` を参照。
  const founderVideoPath = path.join(
    process.cwd(),
    "public",
    "videos",
    "founder-message.mp4",
  );
  const founderPortraitPath = path.join(
    process.cwd(),
    "public",
    "founder-portrait.jpg",
  );
  const founderVideoExists = existsSync(founderVideoPath);
  const founderPortraitExists = existsSync(founderPortraitPath);

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

  // FAQ の JSON-LD、ReactNode を含むため文字列化用に q/a 文字列のみ抽出
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        q: "本当に無料ですか？",
        a: "1968 はすべての機能が完全無料です。クレジットカードの登録も不要、月額・年額の課金も一切ありません。任意でご支援いただける「応援団」制度はありますが、機能差はなく純粋な寄付です。",
      },
      {
        q: "1968年生まれかどうかは、どう確認するのですか？",
        a: "登録後、サービス内で「1968 認証」のお手続きをお願いしています。誓約と「1968 年生まれの記憶」を 80 字以上で自由記述いただき、運営が目視で確認します。所要 5 分・身分証画像の提出は不要です。",
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
        a: "support@1968.love までお気軽にご連絡ください。",
      },
      {
        q: "1968年以外の生まれですが、家族のために応募できますか？",
        a: "申し訳ございません、本サービスはご本人が1968年生まれの方のみご利用いただけます。代理での申し込みはご遠慮ください。",
      },
      {
        q: "応募すれば必ず参加できますか？",
        a: "ベータ期間中は人数を絞ってご招待しています。お申し込みの順序や、活動内容を拝見して順次ご案内します。あらかじめご了承ください。",
      },
    ].map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "同い年だけで、もう一度本音で話せる場所を。 | 1968 ベータテスター募集",
    description:
      "1968 年（昭和 43 年）生まれだけの掲示板「1968」、最初の 30 人を一緒に育ててください。創設メンバー限定の永久バッジ・専用ラウンジ等 8 つの特典が永久付帯。",
    url: "https://1968.love/beta",
    inLanguage: "ja-JP",
    isPartOf: { "@id": "https://1968.love/#website" },
    about: { "@id": "https://1968.love/#organization" },
  };

  return (
    <div className="bg-background text-foreground pb-24 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* ヒーロー、共感訴求型。Instagram in-app ブラウザでも収まるよう mobile は 60svh */}
      <section className="relative min-h-[60svh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden px-4 py-12 sm:py-20">
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* 残席カウンタ、「最初の 30 名」の当事者感を込めた表現 */}
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full border-2 border-primary/40 bg-primary/5">
            <span
              className={`size-2.5 rounded-full ${isFull ? "bg-foreground/40" : "bg-primary animate-pulse"}`}
              aria-hidden
            />
            <span className="text-sm sm:text-base font-bold text-primary">
              {isFull ? (
                <>募集終了</>
              ) : (
                <>
                  残り <span className="text-xl sm:text-2xl">{remaining}</span> 名
                  <span className="text-foreground/60 font-normal">
                    {" "}
                    / 最初の {BETA_SLOTS} 名
                  </span>
                </>
              )}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-5 sm:mb-6 leading-tight">
            同い年だけで、
            <br />
            <span className="text-primary">もう一度、本音で話せる場所を。</span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl mb-4 text-foreground/80 leading-relaxed">
            1968 年、昭和 43 年生まれだけの掲示板。
            <br />
            まだ何もないこの場所を、
            <br className="sm:hidden" />
            最初の 30 人で一緒に育ててください。
          </p>
          <p className="text-sm sm:text-base mb-8 text-foreground/65 leading-7">
            通常会員には付かない、創設メンバー限定の 8 つの特典も永久付帯します。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <a
              href="#application-form"
              className="inline-flex items-center justify-center bg-primary text-white px-8 py-4 rounded-full text-lg font-bold hover:opacity-90 active:opacity-90 transition-opacity min-w-[240px] no-underline"
              aria-label="応募フォームへ移動"
            >
              {isFull ? "応募状況を見る" : "応募フォームへ →"}
            </a>
            <a
              href="#why"
              className="inline-flex items-center justify-center text-primary text-base font-medium underline underline-offset-4 px-4 py-2"
            >
              この場所に込めた想いを見る
            </a>
          </div>
        </div>
      </section>

      {/* 共感セクション、ヒーロー直下、白基調で温度を上げすぎない */}
      <section id="empathy" className="py-16 sm:py-20 px-4 scroll-mt-4 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-snug">
            50 代になって、
            <br />
            <span className="text-primary">同世代だけで話せる場所が少なくなった。</span>
          </h2>
          <div className="mt-8 sm:mt-10 text-base sm:text-lg text-foreground/80 leading-loose space-y-4">
            <p>
              SNS はある。
              <br className="sm:hidden" />
              でも、若い世代の空気に少し遠慮してしまう。
            </p>
            <p>
              仕事、家族、健康、これからの人生。
              <br />
              同い年だからこそ、気を使わずに話せることがあります。
            </p>
            <p className="pt-2">
              1968 は、昭和 43 年生まれだけが集まる、
              <br />
              小さな掲示板コミュニティです。
            </p>
          </div>
        </div>

        {/* 3 カード、共感の具体例 */}
        <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            <div className="bg-page p-6 sm:p-7 rounded-2xl border border-border">
              <h3 className="text-lg font-bold leading-snug">
                昔の話が自然に通じる
              </h3>
              <p className="mt-3 text-sm sm:text-base text-foreground/80 leading-7">
                テレビ、音楽、学校、時代の空気。同じ年に生まれたからこそ、説明しなくても分かる話があります。
              </p>
            </div>
            <div className="bg-page p-6 sm:p-7 rounded-2xl border border-border">
              <h3 className="text-lg font-bold leading-snug">
                今の悩みを本音で話せる
              </h3>
              <p className="mt-3 text-sm sm:text-base text-foreground/80 leading-7">
                仕事、家族、健康、親のこと、自分のこれから。同世代だから話しやすいテーマがあります。
              </p>
            </div>
            <div className="bg-page p-6 sm:p-7 rounded-2xl border border-border">
              <h3 className="text-lg font-bold leading-snug">
                上下関係ではなく同級生感覚
              </h3>
              <p className="mt-3 text-sm sm:text-base text-foreground/80 leading-7">
                年上でも年下でもない。同じ 1968 年生まれとして、気楽に参加できる場所です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* なぜ作ったのか、運営の言葉。淡い背景で区切って温度を出す */}
      <section id="why" className="py-16 sm:py-20 px-4 scroll-mt-4 bg-amber-50/40">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center leading-snug">
            なぜ、1968 を作ったのか
          </h2>

          {/* 運営者からの動画メッセージ、サイト内 video 直配信。
              public/videos/founder-message.mp4 が配置されたら自動表示。 */}
          {founderVideoExists && (
            <div className="mt-8 sm:mt-10">
              <div className="overflow-hidden rounded-2xl border border-border bg-foreground shadow-sm">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={founderPortraitExists ? "/founder-portrait.jpg" : undefined}
                  className="w-full aspect-video bg-foreground"
                >
                  <source src="/videos/founder-message.mp4" type="video/mp4" />
                  お使いのブラウザは動画再生に対応していません。
                </video>
              </div>
              <p className="mt-3 text-center text-xs text-foreground/60">
                運営者からのメッセージ、2 分 30 秒
              </p>
            </div>
          )}

          <div className="mt-8 sm:mt-10 text-base sm:text-lg text-foreground/85 leading-loose space-y-5">
            <p>
              50 代になってから、
              <br />
              昔のように気軽に話せる場所が少なくなったと感じました。
            </p>
            <p>
              SNS は便利ですが、
              <br />
              誰に見られているか分からず、
              <br className="sm:hidden" />
              本音を書きにくいこともあります。
            </p>
            <p>
              だから、
              <br className="sm:hidden" />
              1968 年生まれだけで集まれる場所を作りました。
            </p>
            <p>
              懐かしい話をするだけではなく、
              <br />
              これからの人生を少し前向きにするための場所。
              <br />
              それが、1968 です。
            </p>
          </div>

          {/* 署名、ポートレートと並べて誠意を視覚化。
              public/founder-portrait.jpg が配置されたら自動表示。 */}
          <div className="mt-10 flex items-center justify-end gap-4">
            <div className="text-right text-sm sm:text-base text-foreground/70 leading-7">
              1968 運営
              <br />
              <span className="text-base sm:text-lg font-medium text-foreground">
                油谷 和好
              </span>
            </div>
            {founderPortraitExists && (
              <Image
                src="/founder-portrait.jpg"
                alt="運営者、油谷和好"
                width={64}
                height={64}
                className="size-16 rounded-full object-cover ring-2 ring-amber-200"
              />
            )}
          </div>
        </div>
      </section>

      {/* 創設メンバー特典、8 項目 */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-base sm:text-lg text-foreground/85 mb-3 leading-8 max-w-2xl mx-auto">
            この 30 名は、ただの先行利用者ではありません。
            <br />
            1968 の空気を最初に作る、
            <span className="font-bold text-amber-900">創設メンバー</span>
            です。
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mt-8 mb-3">
            創設メンバー 8 つの特典
          </h2>
          <p className="text-center text-sm sm:text-base text-foreground/70 mb-10 leading-7">
            このベータ募集を通って入会された方だけに、永久に付帯します。
            <br />
            通常会員には付与されない、希少なポジションです。
          </p>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="border-2 border-amber-300 bg-amber-50/40 p-5 sm:p-6 rounded-2xl"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="text-3xl sm:text-4xl shrink-0 leading-none"
                    aria-hidden
                  >
                    {b.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-700 font-bold">
                      特典 {i + 1}
                    </p>
                    <h3 className="text-base sm:text-lg font-bold mt-1 text-amber-900">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm text-foreground/80 leading-7">
                      {b.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-foreground/60 leading-6">
            ※ 7・8 は将来のリリース・出版時に進呈予定の特典です。
          </p>
        </div>
      </section>

      {/* こんな方に参加してほしい、応募条件を熱量ある形で */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12 leading-snug">
            こんな方に
            <br className="sm:hidden" />
            参加してほしいです
          </h2>
          <div className="bg-background p-6 sm:p-8 rounded-2xl shadow-sm border border-border">
            <ul className="space-y-5">
              {[
                "1968 年 1 月 1 日〜12 月 31 日生まれの方",
                "同い年と気軽に話せる場所がほしい方",
                "新しいコミュニティを一緒に育てたい方",
                "不具合や改善点も前向きに伝えていただける方",
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
              { num: 1, title: "応募", time: "1〜2分", desc: "このページのフォームから応募" },
              { num: 2, title: "確認", time: "3〜5営業日", desc: "運営が内容を確認" },
              { num: 3, title: "招待", time: "5分", desc: "招待メールから会員登録" },
              { num: 4, title: "利用開始", time: "永久", desc: "創設メンバーとして全機能を無料で" },
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

      {/* 最後の背中押し、応募直前で当事者感を引き出す */}
      {!isFull && (
        <section className="py-14 sm:py-16 px-4 bg-amber-50/40">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-snug">
              まだ完成していないからこそ、
              <br />
              <span className="text-primary">あなたの声が必要です。</span>
            </h2>
            <div className="mt-6 sm:mt-8 text-base sm:text-lg text-foreground/85 leading-loose space-y-4">
              <p>
                1968 は、これから育っていく場所です。
                <br />
                最初の投稿、最初の会話、最初の空気。
                <br />
                その一つひとつが、これから入ってくる
                <br className="sm:hidden" />
                同世代の居場所になります。
              </p>
              <p>
                最初の 30 名として、
                <br className="sm:hidden" />
                一緒に 1968 を始めてください。
              </p>
            </div>
            <div className="mt-8">
              <a
                href="#application-form"
                className="inline-flex items-center justify-center bg-primary text-white px-8 py-4 rounded-full text-lg font-bold hover:opacity-90 active:opacity-90 transition-opacity min-w-[240px] no-underline"
              >
                応募フォームへ進む →
              </a>
            </div>
          </div>
        </section>
      )}

      {/* 応募フォーム */}
      <section className="py-16 px-4 scroll-mt-4" id="application-form">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
            応募フォーム
          </h2>
          {!isFull && (
            <p className="text-center text-sm text-foreground/70 mb-8">
              所要 1〜2 分・全 2 ステップ
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-sm text-red-900">
              {decodeURIComponent(error)}
            </div>
          )}

          {isFull ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center">
              <p className="text-lg font-bold mb-2">
                ベータ募集は定員に達しました
              </p>
              <p className="text-sm text-foreground/70">
                次回募集のご案内をご希望の方は、
                <a href="mailto:support@1968.love" className="underline">
                  support@1968.love
                </a>
                までお問い合わせください。
              </p>
            </div>
          ) : (
            <BetaApplicationForm action={submitBetaApplication} />
          )}
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

      {/* モバイル sticky CTA、リール流入のスクロール離脱防止 */}
      {!isFull && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <a
            href="#application-form"
            className="block w-full text-center bg-primary text-white py-3.5 rounded-full text-base font-bold no-underline active:opacity-90"
          >
            最初の 30 名に加わる（残り {remaining} 名）→
          </a>
        </div>
      )}
    </div>
  );
}

const BENEFITS: Array<{ emoji: string; title: string; desc: string }> = [
  {
    emoji: "🎖",
    title: "永久「創設メンバー」バッジ",
    desc: "通常会員には絶対に付かない、特別デザインのバッジ。プロフィール・投稿に永久に表示されます。",
  },
  {
    emoji: "🏛",
    title: "創設メンバー専用ラウンジ",
    desc: "一般会員には見えない非公開スレッド。創設メンバー同士で運営の裏話・要望共有ができる場です。",
  },
  {
    emoji: "📜",
    title: "創設メンバー名簿への掲載",
    desc: "サイト内の特設ページにニックネームを掲載します（希望制、いつでも非公開に切替可）。",
  },
  {
    emoji: "📬",
    title: "油谷さん直通チャンネル",
    desc: "運営との非公開スレッドで、ご要望・ご提案を直接届けられます。創設メンバーの声が機能になります。",
  },
  {
    emoji: "🚀",
    title: "新機能ファーストアクセス",
    desc: "オフ会機能・コラボ案件など、新機能をリリース前に試せる。正式公開前に意見を反映できます。",
  },
  {
    emoji: "⭐",
    title: "「創設応援団」称号 1 年無料進呈",
    desc: "通常 3,000 円の応援団称号を、初年度は無料で付与。応援団ラウンジ・優先抽選などの特典も自動付帯。",
  },
  {
    emoji: "📕",
    title: "将来の書籍・写真集を無料贈呈",
    desc: "「1968年生まれが語る昭和」など、コミュニティから生まれる出版物が完成した際に、創設メンバーへ進呈する予定です。",
  },
  {
    emoji: "✍",
    title: "書籍出版時の「創設メンバー」クレジット",
    desc: "巻末の謝辞ページにニックネームを掲載します（希望制）。コミュニティの歴史に名前が刻まれます。",
  },
];

const FAQS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "本当に無料ですか？",
    a: "1968 はすべての機能が完全無料でご利用いただけます。クレジットカードの登録も不要、月額・年額の課金も一切ありません。任意でご支援いただける「応援団」制度はありますが、機能差はなく純粋な寄付です。",
  },
  {
    q: "1968 年生まれかどうかは、どう確認するのですか？",
    a: "登録後、サービス内で「1968 認証」のお手続きをお願いしています。誓約と「1968 年生まれの記憶」を 80 字以上で自由記述いただき、運営が目視で確認します。所要 5 分・身分証画像の提出は不要です。",
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
