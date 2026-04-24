-- 掲示板の本体テーブル、threads・replies・likes・reports。
-- 閲覧 RLS はカテゴリの tier と閲覧者のランクで制御する。
-- 投稿レート制限は Server Action 側で行うため、RLS ではランク確認までを担当する。

-- =======================================
-- threads
-- =======================================
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  category_id int not null references public.categories (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 5000),
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  view_count int not null default 0,
  reply_count int not null default 0,
  like_count int not null default 0,
  is_locked boolean not null default false
);

comment on column public.threads.media is
  'Supabase Storage 上のメディアファイルメタデータ配列、{path, type(image|video), mime, size, width?, height?}';

create index threads_category_id_created_at_idx
  on public.threads (category_id, created_at desc);

-- =======================================
-- replies
-- =======================================
create table public.replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  media jsonb not null default '[]'::jsonb,
  parent_reply_id uuid references public.replies (id) on delete set null,
  like_count int not null default 0,
  created_at timestamptz not null default now()
);

create index replies_thread_id_created_at_idx
  on public.replies (thread_id, created_at);

-- =======================================
-- likes
-- =======================================
create table public.likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'reply')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

-- =======================================
-- reports
-- =======================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_type text not null check (target_type in ('thread', 'reply')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default '未対応' check (status in ('未対応', '対応中', '完了')),
  handled_at timestamptz,
  handled_by uuid,
  created_at timestamptz not null default now()
);

comment on column public.reports.handled_by is
  'admins.id を想定、admins テーブル追加後にフェーズ6で FK 化する';

-- =======================================
-- トリガー、reply_count と like_count の維持
-- =======================================

-- threads.updated_at、threads 更新時に now() で上書き
create trigger threads_set_updated_at
  before update on public.threads
  for each row execute function public.set_updated_at();

-- reply_count、replies の追加・削除時に threads.reply_count を増減
create or replace function public.handle_reply_count_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.threads
       set reply_count = reply_count + 1
     where id = new.thread_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.threads
       set reply_count = greatest(reply_count - 1, 0)
     where id = old.thread_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger replies_maintain_thread_reply_count_insert
  after insert on public.replies
  for each row execute function public.handle_reply_count_change();

create trigger replies_maintain_thread_reply_count_delete
  after delete on public.replies
  for each row execute function public.handle_reply_count_change();

-- like_count、likes の追加・削除時に target の like_count を増減
create or replace function public.handle_like_count_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  delta int;
  t_type text;
  t_id uuid;
begin
  if tg_op = 'INSERT' then
    delta := 1;
    t_type := new.target_type;
    t_id := new.target_id;
  elsif tg_op = 'DELETE' then
    delta := -1;
    t_type := old.target_type;
    t_id := old.target_id;
  else
    return null;
  end if;

  if t_type = 'thread' then
    update public.threads
       set like_count = greatest(like_count + delta, 0)
     where id = t_id;
  elsif t_type = 'reply' then
    update public.replies
       set like_count = greatest(like_count + delta, 0)
     where id = t_id;
  end if;

  if tg_op = 'INSERT' then
    return new;
  else
    return old;
  end if;
end;
$$;

create trigger likes_maintain_count_insert
  after insert on public.likes
  for each row execute function public.handle_like_count_change();

create trigger likes_maintain_count_delete
  after delete on public.likes
  for each row execute function public.handle_like_count_change();

-- =======================================
-- ヘルパー関数、現在ユーザーのランク
-- RLS 内で SELECT users を書くと再帰的な policy チェックで複雑になるため関数化。
-- SECURITY DEFINER で RLS を bypass する。
-- =======================================
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

grant execute on function public.current_user_rank() to anon, authenticated;

-- =======================================
-- RLS
-- =======================================
alter table public.threads enable row level security;
alter table public.replies enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;

-- threads SELECT、category の tier と user のランクで判定
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
          or (c.tier = 'B' and public.current_user_rank() in ('associate', 'regular'))
          or (c.tier in ('C', 'D') and public.current_user_rank() = 'regular')
        )
    )
  );

-- threads INSERT、user_id は自分、カテゴリの投稿権限を満たす
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
          (c.access_level_post = 'associate' and public.current_user_rank() in ('associate', 'regular'))
          or (c.access_level_post = 'regular' and public.current_user_rank() = 'regular')
        )
    )
  );

-- threads UPDATE、本人による編集は将来追加、現状は service_role と SECURITY DEFINER 関数のみ
-- (view_count/reply_count/like_count の維持は関数・トリガー側)

-- threads DELETE、本人のみ
create policy "threads_delete_own"
  on public.threads
  for delete
  using (auth.uid() = user_id);

-- replies SELECT、thread の閲覧権限があるなら見える（3件制限はアプリ層で実装）
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
          or (c.tier = 'B' and public.current_user_rank() in ('associate', 'regular'))
          or (c.tier in ('C', 'D') and public.current_user_rank() = 'regular')
        )
    )
  );

-- replies INSERT、同じく投稿権限
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
          (c.access_level_post = 'associate' and public.current_user_rank() in ('associate', 'regular'))
          or (c.access_level_post = 'regular' and public.current_user_rank() = 'regular')
        )
    )
  );

create policy "replies_delete_own"
  on public.replies
  for delete
  using (auth.uid() = user_id);

-- likes、本人のみ自分の行を作成・削除・閲覧可能（集計は like_count 列に集約）
create policy "likes_select_own"
  on public.likes
  for select
  using (auth.uid() = user_id);

create policy "likes_insert_own"
  on public.likes
  for insert
  with check (auth.uid() = user_id);

create policy "likes_delete_own"
  on public.likes
  for delete
  using (auth.uid() = user_id);

-- reports、ログインユーザーは自分の通報を作成できる、閲覧は本人のみ（運営は service_role 経由で全件閲覧）
create policy "reports_insert_own"
  on public.reports
  for insert
  with check (auth.uid() = reporter_id);

create policy "reports_select_own"
  on public.reports
  for select
  using (auth.uid() = reporter_id);
