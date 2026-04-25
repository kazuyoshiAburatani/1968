-- 運営の AI ペルソナアカウントを通常会員と区別するためのフラグを追加する。
-- 「運営ちゃん（68）」「運営ちゃん（マダムK）」「運営ちゃん（オジマ）」のような運営 AI が
-- 各カテゴリにシード投稿を入れる際、UI で「運営AI」バッジを表示するために使う。

alter table public.users
  add column is_ai_persona boolean not null default false;

comment on column public.users.is_ai_persona is
  '運営の AI ペルソナアカウント。投稿時に「運営AI」バッジで明示する。';

-- member_display ビューを更新して is_ai_persona も公開する。
-- email など機密情報は引き続き出さない。
drop view if exists public.member_display;
create view public.member_display
with (security_invoker = false)
as
select id as user_id, membership_rank, is_ai_persona
from public.users;

grant select on public.member_display to anon, authenticated;
