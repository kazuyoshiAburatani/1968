-- レイアウト（ヘッダー＋タブバー）に必要なすべての情報を 1 回の RPC で取得する。
-- もともとレイアウトで 5 〜 7 クエリを直列に実行しており、
-- US リージョンの Vercel と ap-northeast-2 の Supabase 間で 1〜3 秒の遅延を生んでいた。
-- これを 1 ラウンドトリップに集約する。

create or replace function public.get_session_header_context(p_user_id uuid)
returns table (
  membership_rank text,
  nickname text,
  avatar_url text,
  is_admin boolean,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with seen as (
    select coalesce(last_notifications_seen_at, '1970-01-01'::timestamptz) as last_seen_at,
           coalesce(membership_rank, 'member') as rank
    from public.users where id = p_user_id
  ),
  prof as (
    select nickname, avatar_url from public.profiles where user_id = p_user_id
  ),
  adm as (
    select 1 as flag from public.admins where user_id = p_user_id limit 1
  ),
  my_threads as (
    select id from public.threads where user_id = p_user_id
  ),
  unread_dm as (
    select count(*) as c
    from public.messages m
    where m.receiver_id = p_user_id
      and m.created_at > (select last_seen_at from seen)
  ),
  unread_replies as (
    select count(*) as c
    from public.replies r
    where r.thread_id in (select id from my_threads)
      and r.user_id <> p_user_id
      and r.created_at > (select last_seen_at from seen)
  )
  select
    (select rank from seen) as membership_rank,
    (select nickname from prof) as nickname,
    (select avatar_url from prof) as avatar_url,
    coalesce((select true from adm), false) as is_admin,
    coalesce((select c from unread_dm), 0) +
      coalesce((select c from unread_replies), 0) as unread_count;
$$;

grant execute on function public.get_session_header_context(uuid) to authenticated, anon;
