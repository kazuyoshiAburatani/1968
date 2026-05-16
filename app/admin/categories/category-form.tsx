"use client";

import Link from "next/link";
import { useState } from "react";
import {
  POST_LEVELS,
  TIER_LABELS,
  TIER_VALUES,
  VIEW_LEVELS,
} from "@/lib/validation/category";
import { CATEGORY_ICON_GROUPS, CategoryIcon } from "@/components/category-icon";

type Initial = {
  id?: number;
  slug?: string;
  name?: string;
  icon?: string | null;
  description?: string | null;
  display_order?: number;
  tier?: (typeof TIER_VALUES)[number];
  access_level_view?: (typeof VIEW_LEVELS)[number];
  access_level_post?: (typeof POST_LEVELS)[number];
  posting_limit_per_day?: number | null;
  requires_tenure_months?: number;
};

// アイコン候補は components/category-icon.tsx の CATEGORY_ICON_GROUPS から取得。
// テーマ別にグループ化された Remix Icon のクラス名（ri-*-line 系）。

export function CategoryForm({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void> | void;
  initial?: Initial;
  submitLabel: string;
}) {
  // アイコン入力、絵文字候補のクリック反映のため state で管理
  const [icon, setIcon] = useState<string>(initial?.icon ?? "");

  return (
    <form action={action} className="mt-6 space-y-5">
      {initial?.id && (
        <input type="hidden" name="id" value={initial.id} />
      )}

      <Field label="カテゴリ名" required>
        <input
          type="text"
          name="name"
          required
          maxLength={40}
          defaultValue={initial?.name ?? ""}
          className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
        />
      </Field>

      <Field
        label="アイコン"
        hint="下のリストから選択、または ri-*-line 形式のクラス名（Remix Icon）を直接入力。絵文字も可"
      >
        <div className="flex items-stretch gap-2">
          <span
            aria-hidden
            className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] w-14 rounded border border-border bg-muted text-2xl text-foreground/80"
          >
            <CategoryIcon icon={icon} />
          </span>
          <input
            type="text"
            name="icon"
            maxLength={40}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="ri-bookmark-line など"
            className="flex-1 min-w-0 min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background font-mono text-sm"
          />
          {icon && (
            <button
              type="button"
              onClick={() => setIcon("")}
              className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-3 rounded border border-border text-xs hover:bg-muted"
            >
              クリア
            </button>
          )}
        </div>

        {/* テーマ別ピッカー */}
        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          {CATEGORY_ICON_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-foreground/60 mb-1.5">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.icons.map((ri) => (
                  <button
                    key={ri}
                    type="button"
                    onClick={() => setIcon(ri)}
                    title={ri}
                    aria-label={`アイコンを ${ri} にする`}
                    className={`inline-flex items-center justify-center size-9 rounded border text-xl transition-colors ${
                      icon === ri
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground/75 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <i className={ri} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Field>

      <Field label="slug（URL に使う英小文字）" required hint="例 nostalgia-anime">
        <input
          type="text"
          name="slug"
          required
          minLength={2}
          maxLength={40}
          defaultValue={initial?.slug ?? ""}
          pattern="^[a-z0-9][a-z0-9-]*$"
          className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background font-mono text-sm"
        />
      </Field>

      <Field label="説明" hint="200 文字以内、任意">
        <textarea
          name="description"
          maxLength={200}
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="表示順" required>
          <input
            type="number"
            name="display_order"
            required
            min={1}
            max={99}
            defaultValue={initial?.display_order ?? 1}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </Field>
        <Field label="段階" required>
          <select
            name="tier"
            required
            defaultValue={initial?.tier ?? "A"}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          >
            {TIER_VALUES.map((t) => (
              <option key={t} value={t}>
                {t}（{TIER_LABELS[t]}）
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="閲覧可能" required>
          <select
            name="access_level_view"
            required
            defaultValue={initial?.access_level_view ?? "guest"}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          >
            <option value="guest">ゲスト〜</option>
            <option value="member">会員〜</option>
            <option value="verified">正会員のみ</option>
          </select>
        </Field>
        <Field label="投稿可能" required>
          <select
            name="access_level_post"
            required
            defaultValue={initial?.access_level_post ?? "member"}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          >
            <option value="member">会員〜</option>
            <option value="verified">正会員のみ</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="1日投稿上限" hint="空欄で無制限">
          <input
            type="number"
            name="posting_limit_per_day"
            min={1}
            max={99}
            defaultValue={initial?.posting_limit_per_day ?? ""}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </Field>
        <Field label="参加要件 ヶ月" hint="0 で誰でも、3 で入会3ヶ月以上">
          <input
            type="number"
            name="requires_tenure_months"
            min={0}
            max={60}
            defaultValue={initial?.requires_tenure_months ?? 0}
            className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
          />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="inline-flex items-center min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-medium active:opacity-90"
        >
          {submitLabel}
        </button>
        <Link
          href="/admin/categories"
          className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full border border-border no-underline hover:bg-muted text-sm"
        >
          一覧へ戻る
        </Link>
      </div>
    </form>
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
      <span className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-700">*</span>}
      </span>
      {hint && (
        <span className="block text-xs text-foreground/60 mb-1.5 mt-0.5">
          {hint}
        </span>
      )}
      <span className="block mt-1.5">{children}</span>
    </label>
  );
}
