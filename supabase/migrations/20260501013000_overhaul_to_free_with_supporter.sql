-- 完全無料化 + 年次応援団 + 創設メンバーフラグ + 軽量身分証認証 へ全面移行する。
--
-- ・課金（正会員プラン）を撤廃、users.membership_rank を 'member' / 'verified' の 2 値に再編
--   ('regular' → 'verified' リネーム、身分証承認のみで決まる)
-- ・年次応援団（一回 3000 円）テーブル supporters を新設
-- ・創設メンバーフラグ users.is_founding_member を追加（ベータ承認で立つ）
-- ・身分証認証は self_declaration（誓約 + 200字エッセイ + 署名）を新規 document_type として追加
-- ・カテゴリの段階別アクセス制御を再定義
--   段階A：ゲスト閲覧 / member 投稿
--   段階B：member 閲覧 / verified 投稿
--   段階C：verified 閲覧 / verified 投稿
--   段階D：verified 閲覧 / verified 投稿（オフ会）

-- =============================================================
-- 1. users テーブル、'regular' → 'verified' に rename、フラグ追加
-- =============================================================
alter table public.users drop constraint if exists users_membership_rank_check;

update public.users
  set membership_rank = 'verified'
  where membership_rank = 'regular';

alter table public.users
  add constraint users_membership_rank_check
  check (membership_rank in ('member', 'verified'));

alter table public.users alter column membership_rank set default 'member';

alter table public.users
  add column if not exists is_founding_member boolean not null default false,
  add column if not exists founding_member_since timestamptz;

comment on column public.users.is_founding_member is
  'ベータ募集経由で承認された創設メンバー。永久に true、特別バッジと専用ラウンジへのアクセス権を持つ。';

-- =============================================================
-- 2. ランク自動計算、subscription 依存を撤廃して verified 単独で判定
-- =============================================================
create or replace function public.compute_membership_rank(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when coalesce((select verified from public.users where id = p_user_id), false)
    then 'verified'
    else 'member'
  end;
$$;

-- subscriptions の trigger は残すが、もはや rank に影響しない。後述の Stripe 改修で
-- subscriptions テーブルへの新規 insert は止まり、過去レコードのみ閲覧用に残す。

-- =============================================================
-- 3. 既存ユーザーのランクを再評価
-- =============================================================
do $$
declare u record;
begin
  for u in select id from public.users loop
    perform public.refresh_user_rank(u.id);
  end loop;
end $$;

-- =============================================================
-- 4. 応援団テーブル supporters、年次サポーター記録
-- =============================================================
create table if not exists public.supporters (
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null check (year >= 2026 and year <= 2100),
  paid_at timestamptz not null default now(),
  amount_yen int not null default 3000 check (amount_yen >= 0),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  -- ベータ組には初年度 2026 を運営側が無料進呈する。その場合 stripe_payment_intent_id は null。
  granted_by text not null default 'paid'
    check (granted_by in ('paid', 'founding_grant', 'admin_grant')),
  primary key (user_id, year)
);

create index if not exists supporters_year_idx on public.supporters (year);

alter table public.supporters enable row level security;

-- 本人は自分の応援履歴を閲覧可
create policy "supporters_select_own"
  on public.supporters
  for select
  using (auth.uid() = user_id);

-- 認証済みユーザーは全員、誰がどの年に応援団かを閲覧可
-- （応援団バッジ表示・名簿表示・サポーターラウンジの参加判定で全件参照する）
create policy "supporters_select_all_auth"
  on public.supporters
  for select
  to authenticated
  using (true);

-- 運営は全件閲覧可
create policy "supporters_select_admin"
  on public.supporters
  for select
  using (public.is_admin());

-- 運営は手動付与可（応援団の取り消しや進呈）
create policy "supporters_modify_admin"
  on public.supporters
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 書き込みは原則 service_role（Stripe webhook）と admin のみ。
-- 本人による直接 insert は許可しない。

-- =============================================================
-- 5. categories の access_level を新モデルに合わせて再設定
-- =============================================================
alter table public.categories drop constraint if exists categories_access_level_view_check;
alter table public.categories drop constraint if exists categories_access_level_post_check;

-- まず 'regular' 値を 'verified' にリネーム
update public.categories set access_level_view = 'verified' where access_level_view = 'regular';
update public.categories set access_level_post = 'verified' where access_level_post = 'regular';

-- 段階A、ゲスト閲覧 / member 投稿
update public.categories
  set access_level_view = 'guest',
      access_level_post = 'member'
  where tier = 'A';

-- 段階B、member 閲覧 / verified 投稿
update public.categories
  set access_level_view = 'member',
      access_level_post = 'verified'
  where tier = 'B';

-- 段階C・D、verified 閲覧 / verified 投稿
update public.categories
  set access_level_view = 'verified',
      access_level_post = 'verified'
  where tier in ('C', 'D');

alter table public.categories
  add constraint categories_access_level_view_check
  check (access_level_view in ('guest', 'member', 'verified'));

alter table public.categories
  add constraint categories_access_level_post_check
  check (access_level_post in ('member', 'verified'));

-- =============================================================
-- 6. RLS ポリシーを 'verified' に置換、tier 判定も新モデルへ
-- =============================================================
drop policy if exists "threads_select_by_tier" on public.threads;
drop policy if exists "threads_insert_own" on public.threads;
drop policy if exists "replies_select_by_thread_view" on public.replies;
drop policy if exists "replies_insert_own" on public.replies;

create policy "threads_select_by_tier"
  on public.threads
  for select
  using (
    exists (
      select 1
      from public.categories c
      where c.id = threads.category_id
        and (
          c.tier = 'A'
          or (c.tier = 'B' and public.current_user_rank() in ('member', 'verified'))
          or (c.tier in ('C', 'D') and public.current_user_rank() = 'verified')
        )
    )
  );

create policy "threads_insert_own"
  on public.threads
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.categories c
      where c.id = threads.category_id
        and (
          (c.access_level_post = 'member' and public.current_user_rank() in ('member', 'verified'))
          or (c.access_level_post = 'verified' and public.current_user_rank() = 'verified')
        )
    )
  );

create policy "replies_select_by_thread_view"
  on public.replies
  for select
  using (
    exists (
      select 1
      from public.threads t
      join public.categories c on c.id = t.category_id
      where t.id = replies.thread_id
        and (
          c.tier = 'A'
          or (c.tier = 'B' and public.current_user_rank() in ('member', 'verified'))
          or (c.tier in ('C', 'D') and public.current_user_rank() = 'verified')
        )
    )
  );

create policy "replies_insert_own"
  on public.replies
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.threads t
      join public.categories c on c.id = t.category_id
      where t.id = replies.thread_id
        and not t.is_locked
        and (
          (c.access_level_post = 'member' and public.current_user_rank() in ('member', 'verified'))
          or (c.access_level_post = 'verified' and public.current_user_rank() = 'verified')
        )
    )
  );

-- =============================================================
-- 7. verifications テーブルに self_declaration を追加
-- =============================================================
alter table public.verifications drop constraint if exists verifications_document_type_check;

alter table public.verifications
  add constraint verifications_document_type_check
  check (document_type in (
    'mynumber', 'health_insurance', 'driver_license', 'passport',
    'self_declaration'
  ));

-- 「1968年の記憶」エッセイ（200字、self_declaration 必須）
alter table public.verifications
  add column if not exists era_essay text,
  add column if not exists signature text;

comment on column public.verifications.era_essay is
  '「1968年生まれの記憶」自由記述、200字程度。document_type=self_declaration で必須。';
comment on column public.verifications.signature is
  '誓約者本人がタイプしたニックネーム。document_type=self_declaration で必須。';

-- =============================================================
-- 8. RPC を更新、is_supporter / is_founding_member を返す
-- =============================================================
create or replace function public.get_session_header_context(p_user_id uuid)
returns table (
  membership_rank text,
  nickname text,
  avatar_url text,
  is_admin boolean,
  is_founding_member boolean,
  is_supporter boolean,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with u as (
    select
      coalesce(membership_rank, 'member') as rank,
      coalesce(last_notifications_seen_at, '1970-01-01'::timestamptz) as last_seen_at,
      coalesce(is_founding_member, false) as founding
    from public.users where id = p_user_id
  ),
  prof as (
    select nickname, avatar_url from public.profiles where user_id = p_user_id
  ),
  adm as (
    select 1 as flag from public.admins where user_id = p_user_id limit 1
  ),
  current_supporter as (
    select 1 as flag
    from public.supporters
    where user_id = p_user_id
      and year = extract(year from now() at time zone 'Asia/Tokyo')::int
    limit 1
  ),
  my_threads as (
    select id from public.threads where user_id = p_user_id
  ),
  unread_dm as (
    select count(*) as c
    from public.messages m
    where m.receiver_id = p_user_id
      and m.created_at > (select last_seen_at from u)
  ),
  unread_replies as (
    select count(*) as c
    from public.replies r
    where r.thread_id in (select id from my_threads)
      and r.user_id <> p_user_id
      and r.created_at > (select last_seen_at from u)
  )
  select
    (select rank from u) as membership_rank,
    (select nickname from prof) as nickname,
    (select avatar_url from prof) as avatar_url,
    coalesce((select true from adm), false) as is_admin,
    coalesce((select founding from u), false) as is_founding_member,
    coalesce((select true from current_supporter), false) as is_supporter,
    coalesce((select c from unread_dm), 0) +
      coalesce((select c from unread_replies), 0) as unread_count;
$$;

grant execute on function public.get_session_header_context(uuid) to authenticated, anon;

-- =============================================================
-- 9. handle_new_auth_user を更新、ベータ承認済みメールでの登録時に is_founding_member を立てる
-- =============================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_beta_invited boolean;
begin
  -- メールが beta_applications に invited/approved 状態で存在するかチェック
  -- 大文字小文字差を吸収するため lower で比較する
  select exists (
    select 1 from public.beta_applications
    where lower(email) = lower(new.email)
      and status in ('invited', 'approved')
  ) into is_beta_invited;

  insert into public.users (
    id,
    email,
    membership_rank,
    status,
    is_founding_member,
    founding_member_since
  )
  values (
    new.id,
    new.email,
    'member',
    'active',
    coalesce(is_beta_invited, false),
    case when is_beta_invited then now() else null end
  )
  on conflict (id) do nothing;

  -- 招待組の応募レコードを registered に進める
  if is_beta_invited then
    update public.beta_applications
      set status = 'registered',
          registered_user_id = new.id
      where lower(email) = lower(new.email);
  end if;

  -- 創設メンバーには初年度の応援団称号を進呈
  if is_beta_invited then
    insert into public.supporters (
      user_id,
      year,
      paid_at,
      amount_yen,
      granted_by
    ) values (
      new.id,
      extract(year from now() at time zone 'Asia/Tokyo')::int,
      now(),
      0,
      'founding_grant'
    )
    on conflict (user_id, year) do nothing;
  end if;

  return new;
end;
$$;

-- =============================================================
-- 10. member_display ビューに founding/supporter 情報を追加
-- 投稿者バッジ表示で使う、誰でも (user_id, rank, founding, supporter_year_count) を取得可
-- =============================================================
drop view if exists public.member_display;

create view public.member_display
with (security_invoker = false)
as
select
  u.id as user_id,
  u.membership_rank,
  u.is_founding_member,
  exists (
    select 1 from public.supporters s
    where s.user_id = u.id
      and s.year = extract(year from now() at time zone 'Asia/Tokyo')::int
  ) as is_current_supporter,
  (select count(*) from public.supporters s where s.user_id = u.id) as supporter_year_count
from public.users u;

grant select on public.member_display to anon, authenticated;
