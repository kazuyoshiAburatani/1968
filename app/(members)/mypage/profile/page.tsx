import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { PREFECTURES } from "@/lib/prefectures";
import { SubmitButton } from "@/components/submit-button";
import { publicAvatarUrl } from "@/lib/avatar";
import {
  BANNER_COLORS,
  BANNER_COLOR_KEYS,
  type BannerColorKey,
} from "@/lib/home-banner-colors";
import { removeAvatar, updateProfile, uploadAvatar } from "./actions";

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
      "nickname, birth_month, birth_day, gender, prefecture, hometown, school, occupation, introduction, bio_visible, avatar_url, home_banner_color",
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
          {saved === "avatar"
            ? "プロフィール画像を更新しました。"
            : saved === "avatar-removed"
              ? "プロフィール画像を削除しました。"
              : "保存しました。"}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 p-4 text-red-900 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* プロフィール画像、独立フォーム、enctype 必須 */}
      <section className="mt-8">
        <h2 className="font-bold text-base mb-3">プロフィール画像</h2>
        <div className="flex items-center gap-5">
          <AvatarPreview
            url={publicAvatarUrl(profile.avatar_url)}
            nickname={profile.nickname}
          />
          <div className="flex-1 min-w-0">
            <form
              action={uploadAvatar}
              encType="multipart/form-data"
              className="space-y-2"
            >
              <label className="block">
                <input
                  type="file"
                  name="avatar"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  required
                  className="block w-full text-sm file:mr-3 file:px-4 file:py-2.5 file:rounded-full file:border-0 file:bg-primary file:text-white file:font-medium file:cursor-pointer"
                />
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <SubmitButton pendingText="保存中…">画像を保存</SubmitButton>
                {profile.avatar_url && (
                  <form action={removeAvatar}>
                    <button
                      type="submit"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm hover:bg-muted active:bg-muted/70"
                    >
                      画像を削除
                    </button>
                  </form>
                )}
              </div>
              <p className="text-xs text-foreground/60 leading-6">
                JPEG / PNG / WebP、5 MB 以内。正方形で表示されます。
              </p>
            </form>
          </div>
        </div>
      </section>

      <hr className="my-6 border-border" />

      <form action={updateProfile} className="space-y-6">
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

        <Field
          label="マイホーム上部の色"
          hint="ログイン後のホーム画面、上部あいさつバーの背景色を選べます"
        >
          <div
            className="grid grid-cols-4 sm:grid-cols-8 gap-2"
            role="radiogroup"
            aria-label="マイホームのバナー背景色"
          >
            {BANNER_COLOR_KEYS.map((key) => {
              const c = BANNER_COLORS[key];
              const currentValue =
                (profile.home_banner_color as BannerColorKey | null) ??
                "default";
              const checked = currentValue === key;
              return (
                <label
                  key={key}
                  className={`block cursor-pointer rounded-lg border-2 p-2 transition-colors ${
                    checked
                      ? "border-primary"
                      : "border-border hover:border-foreground/40"
                  }`}
                  style={{ backgroundColor: c.bg }}
                >
                  <input
                    type="radio"
                    name="home_banner_color"
                    value={key}
                    defaultChecked={checked}
                    className="sr-only"
                  />
                  <span
                    className="block text-xs font-medium text-center min-h-[2rem] flex items-center justify-center"
                    style={{ color: c.fg }}
                  >
                    {c.label}
                  </span>
                </label>
              );
            })}
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

function AvatarPreview({
  url,
  nickname,
}: {
  url: string | null;
  nickname: string;
}) {
  const initial = nickname.slice(0, 1);
  return url ? (
    <Image
      src={url}
      alt={`${nickname} のプロフィール画像`}
      width={96}
      height={96}
      className="size-24 rounded-full object-cover border border-border bg-muted"
      unoptimized
    />
  ) : (
    <span
      aria-hidden
      className="size-24 rounded-full bg-muted text-foreground/60 inline-flex items-center justify-center text-3xl font-bold border border-border"
    >
      {initial}
    </span>
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
