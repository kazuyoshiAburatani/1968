import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { SubmitButton } from "@/components/submit-button";
import {
  ALLOWED_VERIFICATION_MIME_TYPES,
  DOCUMENT_TYPE_DESCRIPTIONS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_VALUES,
} from "@/lib/validation/verification";
import { submitVerification } from "./actions";

export const metadata: Metadata = {
  title: "身分証の提出",
};

type Props = {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
    type?: (typeof DOCUMENT_TYPE_VALUES)[number];
  }>;
};

type VerificationRow = {
  id: string;
  document_type: (typeof DOCUMENT_TYPE_VALUES)[number];
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
};

const STATUS_LABEL: Record<VerificationRow["status"], string> = {
  pending: "審査中",
  approved: "承認済み",
  rejected: "却下",
};

export default async function VerificationPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { submitted, error, type } = await searchParams;

  const { data: latest } = await supabase
    .from("verifications")
    .select(
      "id, document_type, status, rejection_reason, submitted_at, verified_at",
    )
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle<VerificationRow>();

  const canSubmit = !latest || latest.status === "rejected";
  const selectedType = type ?? null;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <nav className="mb-3 text-sm">
        <Link href="/mypage">← マイページへ戻る</Link>
      </nav>

      <h1 className="text-2xl font-bold">本人確認のお手続き</h1>

      {/* ベネフィット先出し */}
      <section className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <p className="font-bold text-amber-900 flex items-center gap-2">
          <i className="ri-shield-check-fill text-xl" aria-hidden />
          本人確認済みになると…
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-amber-900/90 list-disc pl-5">
          <li>プロフィールに「本人確認済」のバッジが表示されます</li>
          <li>同年代だけ・なりすましのいない安心感がぐっと高まります</li>
          <li>ダイレクトメッセージやオフ会で、相手から信頼されやすくなります</li>
        </ul>
      </section>

      {/* 安心感、データの取扱い */}
      <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground/85 leading-7">
        <p className="font-bold text-foreground flex items-center gap-2">
          <i className="ri-lock-fill text-base text-primary" aria-hidden />
          画像の取扱いについて
        </p>
        <ul className="mt-2 space-y-1 text-xs text-foreground/75 list-disc pl-5">
          <li>運営の確認担当者のみが閲覧します</li>
          <li>暗号化されて安全に保管されます</li>
          <li>承認・却下から <strong>30 日以内</strong> に自動で完全削除されます</li>
          <li>位置情報（GPS）は保存時に自動削除されます</li>
          <li>本人確認以外の目的では一切利用しません</li>
        </ul>
      </section>

      {submitted && (
        <div className="mt-6 rounded-lg border border-primary/40 bg-muted/40 p-4 text-sm">
          <p className="font-bold">身分証を受け付けました 🎉</p>
          <p className="mt-1">
            審査結果は、ご登録のメールと本ページでお知らせします。通常、3 営業日以内です。
          </p>
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* 進捗ステップ表示 */}
      {canSubmit && (
        <ol className="mt-8 grid grid-cols-3 gap-2 text-center text-xs">
          <Step
            num={1}
            label="書類を選ぶ"
            active={!selectedType}
            done={!!selectedType}
          />
          <Step
            num={2}
            label="画像を撮る"
            active={!!selectedType}
            done={false}
          />
          <Step num={3} label="送信完了" active={false} done={false} />
        </ol>
      )}

      {/* 直近の申請の状態 */}
      {latest && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="font-bold">直近の申請</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-foreground/70">書類</dt>
            <dd>{DOCUMENT_TYPE_LABELS[latest.document_type]}</dd>
            <dt className="text-foreground/70">状態</dt>
            <dd>{STATUS_LABEL[latest.status]}</dd>
            <dt className="text-foreground/70">申請日時</dt>
            <dd>{new Date(latest.submitted_at).toLocaleString("ja-JP")}</dd>
            {latest.verified_at && (
              <>
                <dt className="text-foreground/70">確認日時</dt>
                <dd>
                  {new Date(latest.verified_at).toLocaleString("ja-JP")}
                </dd>
              </>
            )}
            {latest.status === "rejected" && latest.rejection_reason && (
              <>
                <dt className="text-foreground/70">却下理由</dt>
                <dd className="text-red-900">{latest.rejection_reason}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {canSubmit ? (
        !selectedType ? (
          // ステップ 1、書類選択
          <section className="mt-8">
            <h2 className="font-bold">どの書類を提出されますか？</h2>
            <p className="mt-1 text-xs text-foreground/60">
              いずれか 1 つで結構です。お持ちの中で、一番準備しやすいものをお選びください。
            </p>
            <ul className="mt-4 space-y-3">
              {DOCUMENT_TYPE_VALUES.map((value) => (
                <li key={value}>
                  <Link
                    href={`/mypage/verification?type=${value}`}
                    className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 hover:bg-muted/40 no-underline"
                  >
                    <span
                      aria-hidden
                      className="shrink-0 inline-flex items-center justify-center size-12 rounded-full bg-primary/10 text-2xl"
                    >
                      {value === "mynumber" && "🪪"}
                      {value === "driver_license" && "🚗"}
                      {value === "passport" && "📕"}
                      {value === "health_insurance" && "🏥"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">
                        {DOCUMENT_TYPE_LABELS[value]}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/70 leading-6">
                        {DOCUMENT_TYPE_DESCRIPTIONS[value]}
                      </p>
                    </div>
                    <i
                      className="ri-arrow-right-s-line text-2xl text-foreground/40 self-center"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-center">
              <Link
                href="/mypage"
                className="text-sm text-foreground/60 underline"
              >
                あとで設定する
              </Link>
            </p>
          </section>
        ) : (
          // ステップ 2、撮影 or アップロード
          <section className="mt-8">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">{DOCUMENT_TYPE_LABELS[selectedType]} を提出</h2>
              <Link
                href="/mypage/verification"
                className="text-xs underline text-foreground/70"
              >
                書類を選び直す
              </Link>
            </div>
            <p className="mt-2 text-xs text-foreground/70 leading-6">
              {DOCUMENT_TYPE_DESCRIPTIONS[selectedType]}
            </p>

            <form
              action={submitVerification}
              encType="multipart/form-data"
              className="mt-6 space-y-4"
            >
              <input type="hidden" name="document_type" value={selectedType} />

              {/* 撮影ボタン、モバイルでカメラ起動 */}
              <label className="block">
                <span className="block text-sm font-medium mb-2">
                  📷 その場で撮影する
                </span>
                <input
                  type="file"
                  name="document"
                  accept={ALLOWED_VERIFICATION_MIME_TYPES.join(",")}
                  capture="environment"
                  className="block w-full text-sm file:mr-3 file:px-4 file:py-3 file:rounded-full file:border-0 file:bg-primary file:text-white file:font-medium file:cursor-pointer file:hover:opacity-90"
                  required
                />
              </label>

              <p className="text-center text-xs text-foreground/50">または</p>

              {/* アップロードボタン、ファイル選択 */}
              <label className="block">
                <span className="block text-sm font-medium mb-2">
                  🖼 アルバムから選ぶ
                </span>
                <p className="text-xs text-foreground/60 mb-2">
                  スマホで前もって撮影された方は、こちらからお選びください。
                </p>
                <p className="text-xs text-foreground/50">
                  ※ どちらか 1 つを選んでください（後者を選ぶと前者の選択は上書きされます）
                </p>
              </label>

              <p className="text-xs text-foreground/60 leading-6">
                JPEG / PNG / WebP / PDF、最大 10 MB。氏名・生年月日・顔写真がはっきり読める向きで撮影してください。
                送信した時点で
                <Link href="/privacy" className="underline">
                  プライバシーポリシー
                </Link>
                に同意したものとみなします。
              </p>

              <div className="flex gap-3 pt-2">
                <SubmitButton pendingText="送信中…">
                  この内容で送信する
                </SubmitButton>
                <Link
                  href="/mypage"
                  className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-border no-underline hover:bg-muted text-sm"
                >
                  あとで
                </Link>
              </div>
            </form>
          </section>
        )
      ) : latest?.status === "pending" ? (
        <p className="mt-8 text-sm text-foreground/80">
          現在、提出いただいた書類を審査中です。結果が出るまでお待ちください。
        </p>
      ) : latest?.status === "approved" ? (
        <p className="mt-8 text-sm text-foreground/80">
          ご本人確認が完了しています。手続きは不要です。
        </p>
      ) : null}
    </div>
  );
}

function Step({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li
      className={`flex flex-col items-center gap-1 ${active ? "text-primary font-bold" : done ? "text-emerald-700 font-medium" : "text-foreground/40"}`}
    >
      <span
        className={`inline-flex items-center justify-center size-8 rounded-full text-sm font-bold ${
          active
            ? "bg-primary text-white"
            : done
              ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
              : "bg-muted text-foreground/40"
        }`}
      >
        {done ? "✓" : num}
      </span>
      <span className="text-[11px] leading-tight">{label}</span>
    </li>
  );
}
