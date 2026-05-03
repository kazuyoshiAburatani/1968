-- マイホーム上部の「あいさつバー」の背景色を会員ごとに選べるよう、
-- profiles テーブルに home_banner_color カラムを追加する。
-- 値はプリセットパレットのキー（例 "ivory"、"navy"、"sakura"）または null（既定）。

alter table public.profiles
  add column if not exists home_banner_color text;

comment on column public.profiles.home_banner_color is
  'マイホーム上部のバナー背景色。プリセットキー（"ivory"等）または null（既定の白）。';

-- 制約はアプリ層（Zod）で行う、DB 側はテキスト自由にしておく
-- これによりプリセットを増やしてもマイグレーション不要
