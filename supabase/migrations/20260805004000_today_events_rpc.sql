-- 2026-08-05、「今日は何の日」を 1 クエリで引けるようにする。
--
-- これまではアプリ側で timeline_events を全件（120 行）取り、その中から
-- 今日と同じ月日を絞り込んでいた。ホームを開くたびに毎回 120 行が
-- ソウルのデータベースから東京まで流れてくるのは無駄なので、
-- 絞り込みをデータベース側に寄せる。
--
-- 同じ月日の出来事が無い日も多いため、
--   1. まず月日が一致するもの
--   2. 無ければ同じ月のもの
-- の順に返す。毎日ひとつは必ず何かが出る状態にしておかないと、日課にならない。
create or replace function public.today_events(p_limit int default 3)
returns setof public.timeline_events
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with today as (
    select (now() at time zone 'Asia/Tokyo')::date as d
  ),
  exact_day as (
    select t.*
    from public.timeline_events t, today
    where t.is_active
      and extract(month from t.event_date) = extract(month from today.d)
      and extract(day from t.event_date) = extract(day from today.d)
    order by t.event_date
    limit p_limit
  ),
  same_month as (
    select t.*
    from public.timeline_events t, today
    where t.is_active
      and extract(month from t.event_date) = extract(month from today.d)
    order by t.event_date
    limit p_limit
  )
  select * from exact_day
  union all
  select * from same_month
  where not exists (select 1 from exact_day)
  limit p_limit;
$$;

grant execute on function public.today_events(int) to anon, authenticated;

comment on function public.today_events(int) is
  '「今日は何の日」。日本時間の今日と同じ月日の出来事を返す。無ければ同じ月から補う。';
