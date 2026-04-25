-- ベータテスター応募フォームの送信内容を保管するテーブル。
-- 本登録前の段階で名前・連絡先を集めるため、auth.users とは紐付けない（FK なし）。
-- 採用された方には、後日招待メール → 通常登録 → 油谷さんが手動で is_beta_tester フラグを付与する流れ。

create table public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  -- 入力情報
  name text not null,
  email text not null,
  birth_year int not null check (birth_year = 1968),
  birth_month int not null check (birth_month between 1 and 12),
  birth_day int not null check (birth_day between 1 and 31),
  prefecture text,
  sns_handle text,
  motivation text,
  -- ステータス管理（運営側で更新）
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'invited', 'registered')),
  reviewer_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.admins (id) on delete set null,
  invited_at timestamptz,
  registered_user_id uuid references auth.users (id) on delete set null,
  -- メタ
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beta_applications_status_idx on public.beta_applications (status);
create index beta_applications_email_idx on public.beta_applications (email);
create index beta_applications_created_idx on public.beta_applications (created_at desc);

create trigger beta_applications_set_updated_at
  before update on public.beta_applications
  for each row execute function public.set_updated_at();

comment on table public.beta_applications is
  'ベータテスター募集フォームの応募内容。auth.users とは独立に管理する。';

-- =======================================
-- ベータテスター本人特典のためのカラムを users に追加
-- 案 A の compute_membership_rank と組み合わせて、
-- is_beta_tester=true かつ beta_grant_expires_at が未来なら verified/sub なしで regular 扱い
-- =======================================
alter table public.users
  add column is_beta_tester boolean not null default false,
  add column beta_grant_expires_at timestamptz;

comment on column public.users.is_beta_tester is
  'ベータテスター特典付与フラグ。beta_grant_expires_at までは課金・身分証なしで regular 相当。';

-- compute_membership_rank をベータ特典対応に更新
create or replace function public.compute_membership_rank(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    -- ベータテスター特典が有効な期間中は無条件で regular
    when (
      select is_beta_tester
        and (beta_grant_expires_at is null or beta_grant_expires_at > now())
      from public.users where id = p_user_id
    ) then 'regular'
    -- 通常ルート、verified AND active subscription
    when coalesce((select verified from public.users where id = p_user_id), false)
      and exists (
        select 1 from public.subscriptions
        where user_id = p_user_id and status in ('active', 'trialing')
      )
    then 'regular'
    else 'member'
  end;
$$;

-- users.is_beta_tester / beta_grant_expires_at が変更されたらランクを再計算
create or replace function public.users_beta_refresh_rank()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_user_rank(new.id);
  return new;
end;
$$;

create trigger users_beta_refresh_rank
  after update of is_beta_tester, beta_grant_expires_at on public.users
  for each row
  when (
    old.is_beta_tester is distinct from new.is_beta_tester
    or old.beta_grant_expires_at is distinct from new.beta_grant_expires_at
  )
  execute function public.users_beta_refresh_rank();

-- =======================================
-- RLS、応募フォームは誰でも INSERT 可能（公開フォーム）、
-- SELECT は管理者のみ
-- =======================================
alter table public.beta_applications enable row level security;

create policy "beta_applications_insert_anyone"
  on public.beta_applications
  for insert
  with check (true);

create policy "beta_applications_select_admin"
  on public.beta_applications
  for select
  using (public.is_admin());

create policy "beta_applications_update_admin"
  on public.beta_applications
  for update
  using (public.is_admin())
  with check (public.is_admin());
