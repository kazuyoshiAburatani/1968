-- 2026-08-08、二択の設問の前に出す絵を持たせる。
--
-- 設問だけが縦に並ぶと、どれも同じ見た目になって「読む」作業になる。
-- 左に小さな絵がひとつあるだけで、読む前に「野球の話だ」と分かって目が止まる。
--
-- 基本はアイコンにする。79 問すべてに写真を用意することはできないし、
-- 一部だけ写真になると、写真の無い問いが見劣りして押されなくなる。
-- アイコンなら全部の問いに必ず付き、見た目の格が揃う。
--
-- icon は「運営が明示的に選んだとき」だけ入れる。
-- 空のままでも、設問と選択肢の言葉から lib/poll-icon.ts が推測して必ず何か出す。
-- したがって既存 79 問を手で埋め直す必要はない。
alter table public.polls
  add column if not exists icon text,
  add column if not exists header_image text;

comment on column public.polls.icon is
  '設問の前に出すアイコン（Remix Icon のクラス名）。null なら lib/poll-icon.ts が言葉から推測する。';
comment on column public.polls.header_image is
  'poll-media バケット内のパス。入っているときは、アイコンの代わりに設問の上へ写真を出す。';
