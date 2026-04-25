-- 運営スタッフ（管理者）レコード。auth.users とは別管理で、emial の一致や user_id の任意リンクで紐付ける。
-- 管理画面の認可は public.is_admin() ヘルパで判定する。

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null unique,
  role text not null default 'moderator'
    check (role in ('super_admin', 'moderator', 'support')),
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index admins_user_id_idx on public.admins (user_id);

comment on table public.admins is
  '運営スタッフ。auth.users とは別管理。verifications.verified_by など監査列の参照先。';

-- 管理者判定ヘルパ。RLS や Server Action で auth.uid() が admins に登録済みか確認する。
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- RLS、admins テーブルは管理者のみ閲覧可能
alter table public.admins enable row level security;

create policy "admins_select_admin_only"
  on public.admins
  for select
  using (public.is_admin());
