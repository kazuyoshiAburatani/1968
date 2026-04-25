-- 身分証審査レコード。マイナンバーカード／健康保険証／運転免許証 のいずれかを撮影してアップロードし、
-- 管理者が承認・却下する。承認されると users.verified が true になり、サブスク契約と合わさって正会員に昇格する。
--
-- 設計方針、
-- ・1 ユーザーが複数回アップロードできる（過去に却下されて再提出など）が、pending は同時に 1 件のみ
-- ・画像本体は Storage バケット verification-documents に保管、image_storage_path で参照
-- ・承認・却下から 30 日経過したら image_storage_path を null にして storage からも削除（バッチ）
-- ・verified_by で承認した管理者を記録、監査ログ用

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null
    check (document_type in ('mynumber', 'health_insurance', 'driver_license')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  image_storage_path text,
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verifications_user_id_idx on public.verifications (user_id);
create index verifications_status_idx on public.verifications (status);
-- 30 日後削除バッチが効率よく対象を引けるよう、画像が残っている既決定レコードに部分インデックス
create index verifications_purge_target_idx on public.verifications (verified_at)
  where image_storage_path is not null and status in ('approved', 'rejected');

create trigger verifications_set_updated_at
  before update on public.verifications
  for each row execute function public.set_updated_at();

comment on table public.verifications is
  '身分証審査レコード。承認後 30 日で画像本体は purge され、メタデータのみ保持される。';

-- =======================================
-- users.verified 列を追加
-- =======================================
alter table public.users add column verified boolean not null default false;

comment on column public.users.verified is
  '身分証承認済みフラグ。verifications.status=''approved'' を最後に持つ場合 true。';

-- =======================================
-- ランク自動再計算、users.verified と subscriptions の active を AND で見て決定する。
-- 案 A、支払い済み AND 身分証承認済み の両方で regular、それ以外は member。
-- =======================================
create or replace function public.compute_membership_rank(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when coalesce((select verified from public.users where id = p_user_id), false)
      and exists (
        select 1 from public.subscriptions
        where user_id = p_user_id and status in ('active', 'trialing')
      )
    then 'regular'
    else 'member'
  end;
$$;

-- ヘルパ、対象 user の rank を再計算して必要なら反映
create or replace function public.refresh_user_rank(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  computed text;
begin
  if p_user_id is null then return; end if;
  computed := public.compute_membership_rank(p_user_id);
  update public.users
    set membership_rank = computed
    where id = p_user_id
      and membership_rank is distinct from computed;
end;
$$;

-- verifications の status 変更で users.verified を同期させ、ランクも再計算する
create or replace function public.sync_user_verified()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  any_approved boolean;
begin
  -- どの行が変わっても、対象 user に approved が 1 件でもあれば true、無ければ false
  select exists (
    select 1 from public.verifications
    where user_id = coalesce(new.user_id, old.user_id)
      and status = 'approved'
  ) into any_approved;

  update public.users
    set verified = any_approved
    where id = coalesce(new.user_id, old.user_id)
      and verified is distinct from any_approved;

  perform public.refresh_user_rank(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

create trigger verifications_sync_user_verified
  after insert or update or delete on public.verifications
  for each row execute function public.sync_user_verified();

-- subscriptions が変化した時もランクを再計算
create or replace function public.subscriptions_refresh_rank()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_user_rank(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

create trigger subscriptions_refresh_rank
  after insert or update or delete on public.subscriptions
  for each row execute function public.subscriptions_refresh_rank();

-- =======================================
-- 既存ユーザーのランクを案 A 基準で再評価
-- verified=false のため、今 regular の人は member に降格される
-- =======================================
do $$
declare u record;
begin
  for u in select id from public.users loop
    perform public.refresh_user_rank(u.id);
  end loop;
end $$;

-- =======================================
-- RLS
-- =======================================
alter table public.verifications enable row level security;

-- 本人は自分の審査状況を閲覧可
create policy "verifications_select_own"
  on public.verifications
  for select
  using (auth.uid() = user_id);

-- 本人は新規申請を作成可、ただし pending が既に存在する場合は不可
create policy "verifications_insert_own"
  on public.verifications
  for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and verified_at is null
    and verified_by is null
    and not exists (
      select 1 from public.verifications v
      where v.user_id = auth.uid() and v.status = 'pending'
    )
  );

-- 管理者は全件閲覧・更新可、status と verified_by を承認時に書き換える
create policy "verifications_select_admin"
  on public.verifications
  for select
  using (public.is_admin());

create policy "verifications_update_admin"
  on public.verifications
  for update
  using (public.is_admin())
  with check (public.is_admin());
