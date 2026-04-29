"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { PREFECTURES } from "@/lib/prefectures";

// 応募フォーム、2 ステップ式。
// 心理的負荷を下げるためにステップ 1 は必須項目（お名前・メール・生年月日）のみ表示、
// ステップ 2 で都道府県・SNS・応募動機・利用規約同意を出す。
// 「次へ」「戻る」は React state で表示切替、入力値は React 内で保持されるため
// 行き来しても消えない。submit 時には form 内の全 input 値が一括で送信される。

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

export function BetaApplicationForm({ action }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const formRef = useRef<HTMLFormElement>(null);

  function goNext() {
    const form = formRef.current;
    if (!form) return;
    // ステップ 1 の必須項目だけブラウザ標準バリデーション、display:none の項目は対象外。
    if (form.reportValidity()) {
      setStep(2);
      window.requestAnimationFrame(() => {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function goBack() {
    setStep(1);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-background p-6 sm:p-8 rounded-2xl shadow-sm border border-border space-y-6"
    >
      {/* honeypot、bot 弾き */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
      />

      {/* ステップインジケータ */}
      <div className="flex items-center gap-3 text-xs sm:text-sm">
        <StepDot num={1} active={step === 1} done={step === 2} label="基本情報" />
        <span className="flex-1 h-px bg-border" />
        <StepDot num={2} active={step === 2} label="その他" />
      </div>

      {/* ===== Step 1 ===== */}
      <div className={step === 1 ? "space-y-6" : "hidden"}>
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
            required={step === 1}
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
            required={step === 1}
            autoComplete="email"
            inputMode="email"
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
              required={step === 1}
              defaultValue=""
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
              required={step === 1}
              defaultValue=""
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
        </div>

        <button
          type="button"
          onClick={goNext}
          className="w-full inline-flex items-center justify-center bg-primary text-white py-4 rounded-full text-lg sm:text-xl font-bold hover:opacity-90 active:opacity-90 transition-opacity"
        >
          次へ →
        </button>
        <p className="text-center text-xs text-foreground/60">
          残り 1 ステップ・所要 1 分以内
        </p>
      </div>

      {/* ===== Step 2 ===== */}
      <div className={step === 2 ? "space-y-6" : "hidden"}>
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
            required={step === 2}
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center justify-center px-5 py-4 rounded-full border border-border bg-background text-foreground text-base font-medium hover:bg-muted/40"
          >
            ← 戻る
          </button>
          <SubmitButton
            className="flex-1 py-4 text-lg sm:text-xl"
            pendingText="送信中…"
          >
            応募する
          </SubmitButton>
        </div>
        <p className="text-center text-xs text-foreground/60">
          ✉ 受付完了メールが届きます・3〜5 営業日でご連絡
        </p>
      </div>
    </form>
  );
}

function StepDot({
  num,
  active,
  done,
  label,
}: {
  num: number;
  active?: boolean;
  done?: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      <span
        className={[
          "size-7 rounded-full inline-flex items-center justify-center text-xs font-bold border",
          done
            ? "bg-emerald-600 text-white border-emerald-600"
            : active
              ? "bg-primary text-white border-primary"
              : "bg-background text-foreground/50 border-border",
        ].join(" ")}
        aria-hidden
      >
        {done ? "✓" : num}
      </span>
      <span
        className={
          active || done ? "font-bold text-foreground" : "text-foreground/60"
        }
      >
        {label}
      </span>
    </span>
  );
}
