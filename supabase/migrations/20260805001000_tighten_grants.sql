-- 2026-08-05、権限の締め直し。
-- 直前のリニューアルで作った関数・ビューについて、セキュリティアドバイザの指摘を潰す。

-- =============================================================
-- 1. participation_stats ビューを撤去する
-- =============================================================
-- 運営が賑わいを把握するために作ったが、anon に select を許していたため、
-- 未登録の人が会員数の総数を読める状態になっていた。
-- 「会員2名」の可視化こそが今回のリニューアルで潰した離脱要因なので、
-- これを外に出す口を残しておく意味がない。
-- 運営向けの集計は管理画面が service_role で直接数える方式に統一する。
drop view if exists public.participation_stats;

-- =============================================================
-- 2. トリガー関数を REST から呼べないようにする
-- =============================================================
-- handle_new_auth_user と sync_user_email は auth.users のトリガーから呼ばれる
-- security definer 関数で、外部から直接叩ける必要がまったくない。
-- PostgREST 経由で anon / authenticated が実行できる状態は避ける。
revoke execute on function public.handle_new_auth_user() from anon, authenticated;
revoke execute on function public.sync_user_email() from anon, authenticated;

-- =============================================================
-- 3. set_updated_at の search_path を固定する
-- =============================================================
-- security definer ではないが、検索パスが可変のままだと将来の取り違えを招く。
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- 4. member_display の公開列を必要最小限にする
-- =============================================================
-- 投稿者バッジの表示に要るのは「創設メンバーかどうか」だけ。
-- ランクは 1 種類しか無くなったので出す意味がない。
drop view if exists public.member_display;

create view public.member_display
with (security_invoker = false)
as
select
  u.id as user_id,
  u.is_ai_persona,
  u.is_founding_member
from public.users u;

grant select on public.member_display to anon, authenticated;
