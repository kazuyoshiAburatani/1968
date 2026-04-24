-- 掲示板カテゴリの定義と seed
-- tier、段階A〜D、閲覧・投稿の権限階層を表す
-- access_level_view、ゲスト／準会員／正会員
-- access_level_post、準会員／正会員
-- posting_limit_per_day、null なら無制限

create table public.categories (
  id int generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  display_order int not null,
  tier text not null check (tier in ('A', 'B', 'C', 'D')),
  access_level_view text not null check (access_level_view in ('guest', 'associate', 'regular')),
  access_level_post text not null check (access_level_post in ('associate', 'regular')),
  posting_limit_per_day int,
  requires_tenure_months int not null default 0
);

comment on column public.categories.tier is
  'A=ゲスト閲覧可・準会員投稿可、B=準会員閲覧可・正会員投稿可、C=正会員のみ、D=正会員＋在籍3ヶ月以上';
comment on column public.categories.posting_limit_per_day is
  'null は無制限、準会員の段階A投稿は1日1件制限など';

-- RLS、メタデータは誰でも閲覧可（カテゴリ名・説明は公開情報）
-- 書き込みはマイグレーションと service_role のみ
alter table public.categories enable row level security;

create policy "categories_select_all"
  on public.categories
  for select
  using (true);

-- 12カテゴリの seed
insert into public.categories (slug, name, description, display_order, tier, access_level_view, access_level_post, posting_limit_per_day, requires_tenure_months) values
  ('showa43-memories',   '昭和43年の記憶',       '同い年ならではの、時代の記憶を語り合う場。',                 1, 'A', 'guest',     'associate', null, 0),
  ('youth-bubble-era',   '青春時代・バブル入社組', '青春やバブル期に見た風景、就職の頃の話など。',               2, 'A', 'guest',     'associate', null, 0),
  ('current-hobbies',    '今ハマっている趣味',   '日々の楽しみ、趣味に関する情報交換。',                      3, 'A', 'guest',     'associate', null, 0),
  ('chitchat',           '雑談・ひとりごと',     'とりとめのない話、気軽なひとり言。',                        4, 'A', 'guest',     'associate', 1,    0),
  ('hometown',           '地元・出身地',         '出身地や今のお住まいの話題。',                              5, 'B', 'associate', 'regular',   null, 0),
  ('career',             '仕事・キャリアの今',   '現役・リタイア・セカンドキャリアなど、仕事の今。',          6, 'B', 'associate', 'regular',   null, 0),
  ('parents-care',       '親のこと・介護',       '同世代だからこそ、聞ける話。',                              7, 'C', 'regular',   'regular',   null, 0),
  ('children-grandchildren', '子ども・孫のこと', '子育てを終えた世代、孫との関わりなど。',                    8, 'C', 'regular',   'regular',   null, 0),
  ('partner',            '夫婦・パートナー',     '夫婦や家族の日々について。',                                9, 'C', 'regular',   'regular',   null, 0),
  ('health',             '健康・体のこと',       '50代以降の体の変化、健康習慣。',                           10, 'C', 'regular',   'regular',   null, 0),
  ('money-retirement',   'お金・老後資金',       '年金、資産、老後の暮らしに関する話題。',                   11, 'C', 'regular',   'regular',   null, 0),
  ('meetups',            'オフ会・集まり',       '同世代で直接会う集まりの告知・参加。',                     12, 'D', 'regular',   'regular',   null, 3);
