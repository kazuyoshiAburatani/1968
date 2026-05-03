-- Phase 3-1, 3-2: 創設メンバーラウンジ + 応援団ラウンジ を追加
--
-- 既存の段階A〜D 体系の外に、新 tier 'L'（Lounge）を追加し、
-- カテゴリレベルで「創設メンバー限定」「応援団限定」のフラグを持たせる。
-- アクセス可否は RLS と current_user_rank() の組み合わせで判定。
-- 運営は無条件でアクセス可（is_admin() バイパス）。

-- =============================================================
-- 1. categories に tier 'L' を追加、専用フラグも追加
-- =============================================================
alter table public.categories drop constraint if exists categories_tier_check;
alter table public.categories
  add constraint categories_tier_check
  check (tier in ('A', 'B', 'C', 'D', 'L'));

alter table public.categories
  add column if not exists requires_founding boolean not null default false,
  add column if not exists requires_supporter boolean not null default false;

comment on column public.categories.requires_founding is
  '創設メンバー（is_founding_member=true）限定カテゴリ。運営も常に閲覧・投稿可。';
comment on column public.categories.requires_supporter is
  '今年の応援団（supporters に当年レコードあり）限定カテゴリ。運営も常に閲覧・投稿可。';

-- =============================================================
-- 2. 2 つのラウンジ・カテゴリを追加（既に存在しなければ）
-- =============================================================
insert into public.categories (
  slug, name, description, display_order, tier,
  access_level_view, access_level_post,
  requires_founding, requires_supporter,
  posting_limit_per_day, requires_tenure_months
)
values
  (
    'founding-lounge',
    '創設メンバーラウンジ',
    'ベータ期間からの創設メンバー限定の語らいの場。運営の裏話や要望共有も気軽に。',
    100,
    'L',
    'verified',
    'verified',
    true,
    false,
    null,
    0
  ),
  (
    'supporters-lounge',
    '応援団ラウンジ',
    '今年の応援団称号をお持ちの方のみご参加いただける、感謝のラウンジ。',
    101,
    'L',
    'verified',
    'verified',
    false,
    true,
    null,
    0
  )
on conflict (slug) do nothing;

-- =============================================================
-- 3. RLS 更新、ラウンジ判定を追加
-- =============================================================
-- ラウンジ閲覧の判定ヘルパー、RLS 内で繰り返し使うので関数化
create or replace function public.can_access_lounge(cat_id int)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    -- 運営は常にアクセス可
    public.is_admin()
    -- 創設メンバー限定カテゴリ：本人が創設メンバー
    or exists (
      select 1
      from public.categories c
      join public.users u on u.id = auth.uid()
      where c.id = cat_id
        and c.requires_founding = true
        and u.is_founding_member = true
    )
    -- 応援団限定カテゴリ：本人が今年の応援団
    or exists (
      select 1
      from public.categories c
      join public.supporters s on s.user_id = auth.uid()
      where c.id = cat_id
        and c.requires_supporter = true
        and s.year = extract(year from now() at time zone 'Asia/Tokyo')::int
    );
$$;

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
          or (c.tier = 'L' and public.can_access_lounge(c.id))
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
          (c.tier <> 'L' and (
            (c.access_level_post = 'member' and public.current_user_rank() in ('member', 'verified'))
            or (c.access_level_post = 'verified' and public.current_user_rank() = 'verified')
          ))
          or (c.tier = 'L' and public.can_access_lounge(c.id))
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
          or (c.tier = 'L' and public.can_access_lounge(c.id))
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
          (c.tier <> 'L' and (
            (c.access_level_post = 'member' and public.current_user_rank() in ('member', 'verified'))
            or (c.access_level_post = 'verified' and public.current_user_rank() = 'verified')
          ))
          or (c.tier = 'L' and public.can_access_lounge(c.id))
        )
    )
  );

grant execute on function public.can_access_lounge(int) to authenticated;
