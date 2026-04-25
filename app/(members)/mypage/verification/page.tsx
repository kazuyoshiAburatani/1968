import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { SubmitButton } from "@/components/submit-button";
import {
  ALLOWED_VERIFICATION_MIME_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_VALUES,
} from "@/lib/validation/verification";
import { submitVerification } from "./actions";

export const metadata: Metadata = {
  title: "身分証の提出",
};

type Props = {
  searchParams: Promise<{ submitted?: string; error?: string }>;
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
  const { submitted, error } = await searchParams;

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

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <nav className="mb-4 text-sm">
        <Link href="/mypage">← マイページへ戻る</Link>
      </nav>

      <h1 className="text-2xl font-bold">身分証の提出</h1>
      <p className="mt-3 text-sm text-foreground/80">
        正会員として全機能をご利用いただくには、ご本人確認が必要です。マイナンバーカード・健康保険証・運転免許証のいずれかを撮影してアップロードしてください。
      </p>
      <p className="mt-2 text-xs text-foreground/60">
        提出いただいた画像は、運営の確認担当者のみが閲覧します。承認・却下から30日後に自動で削除されます。位置情報（GPS）は保存されません。
      </p>

      {submitted && (
        <div className="mt-6 rounded-lg border border-primary/40 bg-muted/40 p-4 text-sm">
          身分証を受け付けました。審査結果はご登録のメール、または本ページでお知らせします（通常、3営業日以内）。
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      {latest && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="font-bold">直近の申請</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-foreground/70">書類</dt>
            <dd>{DOCUMENT_TYPE_LABELS[latest.document_type]}</dd>
            <dt className="text-foreground/70">状態</dt>
            <dd>{STATUS_LABEL[latest.status]}</dd>
            <dt className="text-foreground/70">申請日時</dt>
            <dd>
              {new Date(latest.submitted_at).toLocaleString("ja-JP")}
            </dd>
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
        <form
          action={submitVerification}
          encType="multipart/form-data"
          className="mt-8 space-y-6"
        >
          <fieldset>
            <legend className="block font-medium">
              本人確認書類の種類
              <span className="ml-1 text-sm text-red-700">*</span>
            </legend>
            <div className="mt-2 space-y-2">
              {DOCUMENT_TYPE_VALUES.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-3 min-h-[var(--spacing-tap)]"
                >
                  <input
                    type="radio"
                    name="document_type"
                    value={value}
                    required
                    className="size-5"
                  />
                  <span>{DOCUMENT_TYPE_LABELS[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="block font-medium">
              書類の画像ファイル
              <span className="ml-1 text-sm text-red-700">*</span>
            </span>
            <span className="block text-xs text-foreground/60 mb-2 mt-0.5">
              JPEG / PNG / WebP / PDF、最大 10 MB。氏名・生年月日・顔写真がはっきり読める向きで撮影してください。
            </span>
            <input
              type="file"
              name="document"
              required
              accept={ALLOWED_VERIFICATION_MIME_TYPES.join(",")}
              className="block w-full text-sm"
            />
          </label>

          <p className="text-xs text-foreground/60">
            送信ボタンを押した時点で
            <Link href="/privacy" className="underline">
              プライバシーポリシー
            </Link>
            に同意したものとみなします。
          </p>

          <div className="flex gap-3">
            <SubmitButton pendingText="アップロード中…">
              この内容で送信する
            </SubmitButton>
            <Link
              href="/mypage"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-border no-underline hover:bg-muted"
            >
              キャンセル
            </Link>
          </div>
        </form>
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
