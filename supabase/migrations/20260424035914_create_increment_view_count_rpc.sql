-- スレッドの view_count をアトミックに加算する RPC。
-- RLS では threads の UPDATE は service_role のみ許可されているため、
-- SECURITY DEFINER 関数でバイパスする。
-- 冪等性はクライアント側のクッキーで担保する（1日1回までの増加）。

create or replace function public.increment_thread_view(p_thread_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.threads set view_count = view_count + 1 where id = p_thread_id;
$$;

grant execute on function public.increment_thread_view(uuid) to anon, authenticated;
