import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { PREFECTURES } from "@/lib/prefectures";
import { SubmitButton } from "@/components/submit-button";
import { updateProfile } from "./actions";

export const metadata: Metadata = {
  title: "プロフィール編集",
};

type Props = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function ProfileEditPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { saved, error } = await searchParams;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nickname, birth_month, birth_day, gender, prefecture, hometown, school, occupation, introduction, bio_visible",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    // (members)/layout 側で担保しているはずだが、万一プロフィール未作成ならオンボーディングへ。
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <p>プロフィールが見つかりません。</p>
        <p className="mt-2">
          <Link href="/onboarding">オンボーディングから作成する</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <nav className="mb-4 text-sm">
        <Link href="/mypage">← マイページへ戻る</Link>
      </nav>

      <h1 className="text-2xl font-bold">プロフィール編集</h1>

      {saved && (
        <div className="mt-4 rounded-lg border border-primary/40 bg-muted/40 p-4 text-sm">
          保存しました。
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={updateProfile} className="mt-8 space-y-6">
        <Field label="ニックネーム" required hint="他の会員に表示されるお名前（30文字以内）">
          <input
            type="text"
            name="nickname"
            defaultValue={profile.nickname}
            required
            maxLength={30}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </Field>

        <Field label="生年月日" hint="変更はできません、運営にお問い合わせください">
          <p className="text-base">
            1968年{profile.birth_month}月{profile.birth_day}日
          </p>
        </Field>

        <Field label="性別">
          <select
            name="gender"
            defaultValue={profile.gender ?? ""}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          >
            <option value="">選択しない</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
            <option value="prefer_not_to_say">答えない</option>
          </select>
        </Field>

        <Field label="お住まいの都道府県">
          <select
            name="prefecture"
            defaultValue={profile.prefecture ?? ""}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          >
            <option value="">選択しない</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="出身地" hint="市区町村まで">
          <input
            type="text"
            name="hometown"
            defaultValue={profile.hometown ?? ""}
            maxLength={100}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </Field>

        <Field label="卒業した学校">
          <input
            type="text"
            name="school"
            defaultValue={profile.school ?? ""}
            maxLength={100}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </Field>

        <Field label="職業">
          <input
            type="text"
            name="occupation"
            defaultValue={profile.occupation ?? ""}
            maxLength={50}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </Field>

        <Field label="ひとこと自己紹介" hint="200字以内">
          <textarea
            name="introduction"
            defaultValue={profile.introduction ?? ""}
            maxLength={200}
            rows={4}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </Field>

        <Field label="プロフィールの公開範囲" required>
          <div className="space-y-2">
            <RadioOption
              name="bio_visible"
              value="members_only"
              label="会員のみ（推奨）"
              defaultChecked={profile.bio_visible === "members_only"}
            />
            <RadioOption
              name="bio_visible"
              value="public"
              label="誰でも閲覧可（未ログイン含む）"
              defaultChecked={profile.bio_visible === "public"}
            />
            <RadioOption
              name="bio_visible"
              value="private"
              label="自分だけ"
              defaultChecked={profile.bio_visible === "private"}
            />
          </div>
        </Field>

        <div className="flex gap-3">
          <SubmitButton pendingText="保存中…">保存する</SubmitButton>
          <Link
            href="/mypage"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full border border-border no-underline hover:bg-muted"
          >
            キャンセル
          </Link>
        </div>
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
        <span className="block text-xs text-foreground/60 mb-2 mt-0.5">
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
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-5"
      />
      <span>{label}</span>
    </label>
  );
}
