-- 2026-08-05、配信の男女比を「男性寄り 2 : それ以外 1」に変更する。
--
-- 当初は男女半々で交互に出す方針だった（検証で、男性寄りが続くと女性の参加が
-- まとめて止まると分かっていたため）。ただし立ち上げ期は事情が違う。
-- 最初に入ってくるのは運営の同級生・知人で、その顔ぶれは男性に寄っている。
-- 実際にいる人に向けた話題を出さないと、誰も答えないまま画面だけが埋まる。
--
-- そこで在庫は減らさず、配信の順番だけを組み替える。
-- 男性寄りに軽い重みを与えて並べ直すので、女性向けの話題は消えず後ろに回るだけ。
-- 女性の会員が増えてきたら、この重みを 1.5 → 3.0 に戻せば半々に復帰する。

-- =============================================================
-- 1. 少女まんが誌の二択を公開停止にする
-- =============================================================
-- 先頭に出ていたが、いまの顔ぶれには合わないため下げる。
-- 完全削除はしない。方針が変わったときに戻せるようにしておく。
update public.polls
set is_active = false
where question = '毎月買っていた少女まんが誌は？';

-- =============================================================
-- 2. 二択の配信順を組み替える
-- =============================================================
with ranked as (
  select
    id,
    case when gender_lean = 'male' then 1.5 else 3.0 end
      * row_number() over (
          partition by (gender_lean = 'male') order by sort_index, created_at
        ) as weight
  from public.polls
  where is_active = true
),
ordered as (
  select id, (row_number() over (order by weight, id) - 1)::int as pos from ranked
)
update public.polls p
set sort_index = o.pos,
    published_at = case
      when o.pos < 4 then now() - ((4 - o.pos) || ' hours')::interval
      else now() + (((o.pos - 4) / 2 * 7 + (o.pos - 4) % 2 * 3 + 3) || ' days')::interval
    end
from ordered o
where p.id = o.id;

-- =============================================================
-- 3. 穴埋めお題の配信順を組み替える
-- =============================================================
-- 記事に紐づくお題（stories.topic_id）と自由記述は動かさない。
-- 動かすと、記事の投稿欄が公開前の状態に戻ってしまう。
with target as (
  select t.id, t.gender_lean, t.published_at, t.created_at
  from public.topics t
  where t.is_active = true
    and t.format = 'fill_blank'
    and not exists (select 1 from public.stories s where s.topic_id = t.id)
),
ranked as (
  select
    id,
    case when gender_lean = 'male' then 1.5 else 3.0 end
      * row_number() over (
          partition by (gender_lean = 'male') order by published_at, created_at
        ) as weight
  from target
),
ordered as (
  select id, (row_number() over (order by weight, id) - 1)::int as pos from ranked
)
update public.topics t
set published_at = case
      when o.pos < 6 then now() - ((6 - o.pos) || ' hours')::interval
      else now() + (((o.pos - 6) / 2 * 7 + (o.pos - 6) % 2 * 3 + 3) || ' days')::interval
    end
from ordered o
where t.id = o.id;
