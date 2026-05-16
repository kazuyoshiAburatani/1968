-- カテゴリにアイコン（絵文字）を持たせる。
-- 従来はアプリ側のハードコードマップ（CATEGORY_LOOKS）で slug→emoji していたが、
-- 新規カテゴリの追加や差し替えで毎回コード修正が要るため、DB の列に移す。
-- 既存値はアプリのマップに合わせて seed する。

alter table public.categories
  add column if not exists icon text;

comment on column public.categories.icon is
  'カテゴリ一覧やサムネに表示する絵文字 1 つ、null の場合は表示側で既定値（📌）にフォールバック。';

-- 既存 12 カテゴリのアイコンを CATEGORY_LOOKS と同じ値で seed
update public.categories set icon = '🎬' where slug = 'nostalgia-anime';
update public.categories set icon = '🎤' where slug = 'nostalgia-music';
update public.categories set icon = '📺' where slug = 'nostalgia-tv';
update public.categories set icon = '🍬' where slug = 'nostalgia-snacks';
update public.categories set icon = '🪁' where slug = 'nostalgia-play';
update public.categories set icon = '💬' where slug = 'nostalgia-words';
update public.categories set icon = '🎒' where slug = 'nostalgia-school';
update public.categories set icon = '🥂' where slug = 'bubble-era';
update public.categories set icon = '🌿' where slug = 'living-health';
update public.categories set icon = '🏠' where slug = 'family';
update public.categories set icon = '💴' where slug = 'work-money-retirement';
update public.categories set icon = '🍻' where slug = 'meetups';
update public.categories set icon = '🎖' where slug = 'founding-lounge';
update public.categories set icon = '🌸' where slug = 'supporters-lounge';
