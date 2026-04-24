import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { PREFECTURES } from "@/lib/prefectures";
import { SubmitButton } from "@/components/submit-button";
import { createProfile } from "./actions";

export const metadata: Metadata = {
  title: "プロフィール作成",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { error } = await searchParams;

  // 既にプロフィール作成済みなら /mypage へ
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfile) {
    redirect("/mypage");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">プロフィール作成</h1>
      <p className="mt-2 text-[color:var(--color-foreground)]/80">
        1968 へようこそ。最後にプロフィールをご記入ください。
        あとで変更できますので、お気軽にご記入ください。
      </p>
      <p className="mt-1 text-sm text-[color:var(--color-foreground)]/60">
        登録メール、{user.email}
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createProfile} className="mt-8 space-y-6">
        <Field label="ニックネーム" required hint="他の会員に表示されるお名前です（30文字以内）">
          <input
            type="text"
            name="nickname"
            required
            maxLength={30}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </Field>

        <Field label="生年月日" required hint="1968年（昭和43年）生まれ限定のため、生年は 1968 で固定されています">
          <div className="flex gap-2 items-center">
            <span className="text-[color:var(--color-foreground)]/60">1968 年</span>
            <select
              name="birth_month"
              required
              className="min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
            >
              <option value="">月</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span>月</span>
            <select
              name="birth_day"
              required
              className="min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
            >
              <option value="">日</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span>日</span>
          </div>
        </Field>

        <Field label="性別" hint="任意項目、公開範囲は bio の設定に従います">
          <select
            name="gender"
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          >
            <option value="">選択しない</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
            <option value="prefer_not_to_say">答えない</option>
          </select>
        </Field>

        <Field label="お住まいの都道府県" hint="任意項目">
          <select
            name="prefecture"
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          >
            <option value="">選択しない</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="出身地" hint="市区町村まで、任意項目">
          <input
            type="text"
            name="hometown"
            maxLength={100}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </Field>

        <Field label="卒業した学校" hint="任意項目">
          <input
            type="text"
            name="school"
            maxLength={100}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </Field>

        <Field label="職業" hint="任意項目">
          <input
            type="text"
            name="occupation"
            maxLength={50}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </Field>

        <Field label="ひとこと自己紹介" hint="200字以内、任意項目">
          <textarea
            name="introduction"
            maxLength={200}
            rows={4}
            className="w-full px-3 py-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </Field>

        <Field label="プロフィールの公開範囲" required hint="初期値は「会員のみ」です、あとで変更できます">
          <div className="space-y-2">
            <RadioOption name="bio_visible" value="members_only" label="会員のみ（推奨）" defaultChecked />
            <RadioOption name="bio_visible" value="public" label="誰でも閲覧可（未ログイン含む）" />
            <RadioOption name="bio_visible" value="private" label="自分だけ" />
          </div>
        </Field>

        <SubmitButton className="w-full" pendingText="保存中…">
          登録を完了する
        </SubmitButton>
      </form>
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
        <span className="block text-xs text-[color:var(--color-foreground)]/60 mb-2 mt-0.5">
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}

function RadioOption({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 min-h-[var(--spacing-tap)]">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="size-5" />
      <span>{label}</span>
    </label>
  );
}
