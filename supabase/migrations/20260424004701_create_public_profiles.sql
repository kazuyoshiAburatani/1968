-- 会員プロフィール
-- 1968 年生まれの自己申告情報、公開範囲は bio_visible で制御する。

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  birth_year int not null check (birth_year = 1968),
  birth_month int not null check (birth_month between 1 and 12),
  birth_day int not null check (birth_day between 1 and 31),
  -- 存在しない日付（2月30日など）は make_date が例外を出して挿入を拒否する
  birth_date date generated always as (make_date(birth_year, birth_month, birth_day)) stored,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  prefecture text,
  hometown text,
  school text,
  occupation text,
  introduction text check (char_length(coalesce(introduction, '')) <= 200),
  avatar_url text,
  bio_visible text not null default 'members_only'
    check (bio_visible in ('public', 'members_only', 'private')),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  '会員プロフィール。bio_visible で公開範囲を制御する（public/members_only/private）。';
comment on column public.profiles.bio_visible is
  'public=未ログイン含め誰でも閲覧、members_only=会員のみ閲覧、private=本人のみ。';

-- updated_at の自動更新
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- 閲覧ポリシー、bio_visible と閲覧者のランクに応じて分岐する
create policy "profiles_select_public"
  on public.profiles
  for select
  using (bio_visible = 'public');

create policy "profiles_select_members_only"
  on public.profiles
  for select
  using (
    bio_visible = 'members_only'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.membership_rank in ('associate', 'regular')
    )
  );

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = user_id);

-- 作成、本人かつ public.users に対応行があること
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.users where id = auth.uid())
  );

-- 更新、本人のみ
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 削除、本人のみ（退会時の自己データ削除を想定）
create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (auth.uid() = user_id);
