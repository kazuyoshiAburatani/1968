-- Phase 3-3: 創設メンバー名簿ページ /founding-members に掲載するか否かの opt-in フラグ。
-- 創設メンバー特典として「名簿への掲載」を提供するが、希望制とするため
-- 既定は false（非掲載）、本人がプロフィール編集から有効化する。

alter table public.profiles
  add column if not exists founding_directory_listed boolean not null default false;

comment on column public.profiles.founding_directory_listed is
  '創設メンバー名簿ページへの掲載に同意したか。is_founding_member=true のユーザーのみ意味を持つ。';
