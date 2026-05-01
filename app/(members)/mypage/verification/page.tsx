import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { SubmitButton } from "@/components/submit-button";
import { submitSelfDeclaration } from "./actions";

export const metadata: Metadata = {
  title: "1968 認証",
};

type Props = {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

type VerificationRow = {
  id: string;
  document_type: string;
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

  // 既存のプロフィール（誕生月日のプリセット用）
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, birth_month, birth_day")
    .eq("user_id", user.id)
    .maybeSingle();

  const canSubmit = !latest || latest.status === "rejected";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <nav className="mb-3 text-sm">
        <Link href="/mypage">← マイページへ戻る</Link>
      </nav>

      <h1 className="text-2xl font-bold">1968 認証のお手続き</h1>
      <p className="mt-2 text-sm text-foreground/70 leading-7">
        1968 年生まれであることの誓約と、200 字程度の自由記述だけで完了します。
        身分証画像のアップロードは不要、所要 5 分です。
      </p>

      {/* メリット */}
      <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <p className="font-bold text-amber-900 flex items-center gap-2">
          <i className="ri-shield-check-fill text-xl" aria-hidden />
          認証されると…
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-amber-900/90 list-disc pl-5 leading-7">
          <li>段階B 以降のカテゴリへ投稿できる（地元・仕事・家族 など）</li>
          <li>段階C・D を閲覧できる（介護・健康・お金、オフ会）</li>
          <li>正会員同士のダイレクトメッセージが使える</li>
          <li>「1968認証済」のバッジがプロフィール・投稿に表示される</li>
        </ul>
      </section>

      {/* 心理ゲートの仕組み */}
      <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground/85 leading-7">
        <p className="font-bold text-foreground flex items-center gap-2">
          <i className="ri-information-line text-base text-primary" aria-hidden />
          認証の流れ
        </p>
        <ol className="mt-2 space-y-1 text-xs text-foreground/75 list-decimal pl-5 leading-6">
          <li>誕生月日と、3 つの誓約に同意</li>
          <li>「1968 年生まれの記憶」を 80 字以上で自由に記述</li>
          <li>運営が内容を目視で確認、通常 1〜3 営業日以内に結果をお知らせ</li>
        </ol>
        <p className="mt-2 text-xs text-foreground/60">
          虚偽申告が発覚した場合は、利用規約により退会処分となります。
        </p>
      </section>

      {submitted && (
        <div className="mt-6 rounded-lg border border-primary/40 bg-muted/40 p-4 text-sm">
          <p className="font-bold">1968 認証の申請を受け付けました 🎉</p>
          <p className="mt-1">
            審査結果は、ご登録のメールと本ページでお知らせします。通常、1〜3 営業日以内です。
          </p>
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* 直近の申請の状態 */}
      {latest && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="font-bold">直近の申請</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
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
        <form action={submitSelfDeclaration} className="mt-8 space-y-6">
          {/* STEP 1、生年月日 */}
          <fieldset className="rounded-2xl border border-border bg-background p-5">
            <legend className="font-bold px-2">
              STEP 1、生年月日
            </legend>
            <p className="mt-2 text-xs text-foreground/60">
              年は「1968」で固定です。月日のみご入力ください。
            </p>
            <div className="mt-4 flex gap-2 sm:gap-3">
              <input
                type="text"
                value="1968年"
                className="p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-muted/40 w-24 sm:w-28 text-center"
                readOnly
              />
              <select
                name="birth_month"
                required
                defaultValue={profile?.birth_month ?? ""}
                className="flex-1 p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
              >
                <option value="" disabled>
                  月を選択
                </option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
              <select
                name="birth_day"
                required
                defaultValue={profile?.birth_day ?? ""}
                className="flex-1 p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
              >
                <option value="" disabled>
                  日を選択
                </option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}日
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {/* STEP 2、誓約 */}
          <fieldset className="rounded-2xl border border-border bg-background p-5">
            <legend className="font-bold px-2">
              STEP 2、誓約
            </legend>
            <div className="mt-3 space-y-4 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agree_birth"
                  required
                  className="mt-1 size-5"
                />
                <span>
                  私は <strong>本当に 1968 年生まれです</strong>。
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agree_penalty"
                  required
                  className="mt-1 size-5"
                />
                <span>
                  虚偽申告が発覚した場合、利用規約に基づき{" "}
                  <strong>退会処分</strong> となり、以後の利用ができなくなることに同意します。
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agree_review"
                  required
                  className="mt-1 size-5"
                />
                <span>
                  入力した内容は <strong>運営による目視確認</strong> の対象となり、内容に違和感がある場合は却下されることに同意します。
                </span>
              </label>
            </div>
          </fieldset>

          {/* STEP 3、署名 */}
          <fieldset className="rounded-2xl border border-border bg-background p-5">
            <legend className="font-bold px-2">
              STEP 3、署名
            </legend>
            <p className="mt-2 text-xs text-foreground/60">
              ご自分のニックネームをタイプして署名としてください。
            </p>
            <input
              type="text"
              name="signature"
              required
              maxLength={60}
              defaultValue={profile?.nickname ?? ""}
              className="mt-3 w-full p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background"
              placeholder="例、油谷 和好"
            />
          </fieldset>

          {/* STEP 4、エッセイ */}
          <fieldset className="rounded-2xl border border-border bg-background p-5">
            <legend className="font-bold px-2">
              STEP 4、1968 年生まれの記憶
            </legend>
            <p className="mt-2 text-xs text-foreground/60 leading-6">
              80〜800 字。同年代だからこそ書ける思い出を、ひとつでも結構です。
              <br />
              例、「私が小学生だった頃、家のテレビでよく見ていたのは…」
              <br />
              「中学生のとき、親に怒られながらも夢中になっていたのは…」
            </p>
            <textarea
              name="era_essay"
              rows={6}
              minLength={80}
              maxLength={800}
              required
              className="mt-3 w-full p-3 sm:p-4 border border-border rounded-lg text-base sm:text-lg bg-background h-40 resize-none"
              placeholder="思い出のひとつでも、当時の暮らしのひとコマでも結構です"
            />
            <p className="mt-2 text-xs text-foreground/60">
              この内容はプロフィールには公開されません。運営の確認用にのみ使われます。
            </p>
          </fieldset>

          <div className="flex gap-3 pt-2">
            <SubmitButton pendingText="送信中…" className="flex-1 py-4 text-lg">
              この内容で 1968 認証を申請する
            </SubmitButton>
            <Link
              href="/mypage"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-border no-underline hover:bg-muted text-sm"
            >
              あとで
            </Link>
          </div>
        </form>
      ) : latest?.status === "pending" ? (
        <p className="mt-8 text-sm text-foreground/80">
          現在、提出いただいた申請を運営が確認中です。結果が出るまでお待ちください。
        </p>
      ) : latest?.status === "approved" ? (
        <p className="mt-8 text-sm text-foreground/80">
          1968 認証が完了しています。手続きは不要です。
        </p>
      ) : null}
    </div>
  );
}
