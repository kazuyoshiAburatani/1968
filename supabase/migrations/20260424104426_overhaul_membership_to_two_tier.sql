-- 会員モデルを 4 ランク（guest/pending/associate/regular）から 2 ランク（member/regular）に再編する。
-- ・準会員プラン（月180円）を廃止、無料会員 member と 有料正会員 regular の 2 層に統合
-- ・既存 pending/associate ユーザーは member に降格
-- ・カテゴリ tier は A=4/B=4/C=3/D=1 に再配分、children-grandchildren と partner を C→B に移動
-- ・ゲストは段階A 4 カテゴリのみ閲覧可、段階B 以降はサインインで開放
-- ・無料会員は段階A+B 計 8 カテゴリ閲覧可、段階A に 1日3件まで投稿可
-- ・正会員は全カテゴリ閲覧・投稿可、段階D は在籍 3 ヶ月以上

-- =======================================
-- 1. users.membership_rank を member/regular の 2 値に簡略化
-- =======================================
alter table public.users drop constraint if exists users_membership_rank_check;

update public.users
  set membership_rank = 'member'
  where membership_rank in ('guest', 'pending', 'associate');

alter table public.users
  add constraint users_membership_rank_check
  check (membership_rank in ('member', 'regular'));

alter table public.users alter column membership_rank set default 'member';

-- 新規 auth ユーザー作成時に自動挿入する行を member で作る
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, email, membership_rank, status)
  values (new.id, new.email, 'member', 'active')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- current_user_rank は未ログインを guest として返す契約のまま、rank は member/regular が入る
create or replace function public.current_user_rank()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select membership_rank from public.users where id = auth.uid()),
    'guest'
  );
$$;

-- =======================================
-- 2. categories の tier 再配分と access_level 更新
-- =======================================
alter table public.categories drop constraint if exists categories_access_level_view_check;
alter table public.categories drop constraint if exists categories_access_level_post_check;

-- 旧 associate を新 member に読み替え
update public.categories set access_level_view = 'member' where access_level_view = 'associate';
update public.categories set access_level_post = 'member' where access_level_post = 'associate';

-- children-grandchildren と partner を C から B へ昇格、無料会員も閲覧可能に
update public.categories
  set tier = 'B', access_level_view = 'member', access_level_post = 'regular'
  where slug in ('children-grandchildren', 'partner');

-- 新しい check 制約
alter table public.categories
  add constraint categories_access_level_view_check
  check (access_level_view in ('guest', 'member', 'regular'));

alter table public.categories
  add constraint categories_access_level_post_check
  check (access_level_post in ('member', 'regular'));

-- =======================================
-- 3. threads/replies の RLS を新 rank に合わせて更新
-- =======================================
drop policy if exists "threads_select_by_tier" on public.threads;
drop policy if exists "threads_insert_own" on public.threads;

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
          or (c.tier = 'B' and public.current_user_rank() in ('member', 'regular'))
          or (c.tier in ('C', 'D') and public.current_user_rank() = 'regular')
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
          (c.access_level_post = 'member' and public.current_user_rank() in ('member', 'regular'))
          or (c.access_level_post = 'regular' and public.current_user_rank() = 'regular')
        )
    )
  );

drop policy if exists "replies_select_by_thread_view" on public.replies;
drop policy if exists "replies_insert_own" on public.replies;

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
          or (c.tier = 'B' and public.current_user_rank() in ('member', 'regular'))
          or (c.tier in ('C', 'D') and public.current_user_rank() = 'regular')
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
          (c.access_level_post = 'member' and public.current_user_rank() in ('member', 'regular'))
          or (c.access_level_post = 'regular' and public.current_user_rank() = 'regular')
        )
    )
  );

-- =======================================
-- 4. 投稿者のランクバッジ表示用ビュー
-- RLS を bypass して、誰でも (user_id, membership_rank) のペアだけ取れる。
-- email や stripe_customer_id 等は出さないため、安全。
-- =======================================
create or replace view public.member_display
with (security_invoker = false)
as
select id as user_id, membership_rank
from public.users;

grant select on public.member_display to anon, authenticated;
