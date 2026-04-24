import Link from "next/link";
import { Enso } from "@/components/illustrations/enso";
import { LatestThreadsList } from "@/components/home/latest-threads-list";

// 登録済み・未課金（pending）向け。準会員への課金誘導を中心に据える。
export function HomePending({ nickname }: { nickname: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4">
      {/* あいさつ */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute top-2 right-2 text-accent/25">
          <Enso size={120} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {nickname} さん、ようこそ。
        </h1>
        <p className="mt-3 text-foreground/80">
          登録が完了しました。あとひと息で、同い年の語らいに加われます。
        </p>
      </section>

      {/* 準会員アップグレード案内 */}
      <section className="rounded-xl border-2 border-primary bg-muted/40 p-6 md:p-8">
        <p className="text-sm tracking-wider text-accent">NEXT STEP</p>
        <h2 className="mt-2 text-xl md:text-2xl font-bold">
          月額180円で、語らいに加わりませんか
        </h2>
        <p className="mt-3 text-foreground/80">
          準会員になると、段階A・Bの6カテゴリが読めて、
          段階Aのカテゴリには1日3件まで投稿できます。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/register?plan=associate"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 py-3 rounded-full bg-primary text-white font-bold no-underline hover:opacity-90"
          >
            準会員に入会する（月額180円）
          </Link>
          <Link
            href="/register?plan=regular"
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-6 py-3 rounded-full border border-primary text-primary font-medium no-underline bg-background hover:bg-muted/40"
          >
            正会員を選ぶ（月額480円）
          </Link>
        </div>
        <p className="mt-3 text-xs text-foreground/60">
          決済機能はフェーズ4で追加予定、いましばらくお待ちください。
        </p>
      </section>

      {/* 最新のピックアップ（段階A、ゲスト閲覧可のみ RLS 的に見える） */}
      <section className="mt-12">
        <h2 className="text-lg font-bold">最新の話題（段階A）</h2>
        <p className="mt-1 text-sm text-foreground/70">
          今、同い年の方々が書いている話題です
        </p>
        <div className="mt-4">
          <LatestThreadsList limit={8} />
        </div>
        <p className="mt-4 text-sm">
          <Link href="/board" className="underline font-medium">
            掲示板TOPへ →
          </Link>
        </p>
      </section>

      {/* 正会員で見える世界のチラ見せ */}
      <section className="mt-12 rounded-xl border border-border bg-background p-6">
        <h2 className="text-lg font-bold">正会員の世界</h2>
        <p className="mt-2 text-sm text-foreground/80">
          介護、夫婦、健康、お金。人には聞きにくい話題の7カテゴリが、
          正会員（月額480円）になると閲覧・投稿できます。
          本人確認済みの同世代が集う、安心の語らいの場です。
        </p>
      </section>
    </div>
  );
}
