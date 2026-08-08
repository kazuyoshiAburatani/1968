-- 2026-08-08、配信を「1 日 1 個ずつ」に組み直す。
--
-- 前は年代ごとに 1 週間分をまとめて出す予定だった（8月10日に小学校の16問、
-- 17日に中学の20問…）。それだと 8月31日で在庫が尽きるうえ、
-- 出た週は一度にたくさん出て、その後 6 日間は何も増えない。
-- 毎日ひとつずつ出せば、毎日来る理由ができて、在庫も 2 か月もつ。
--
--   8月10日（公開日） 二択 3 問・お題 3 題（ホームがその日から埋まっているように）
--   8月11日以降       二択 1 問・お題 1 題ずつ、毎朝 0 時
--
-- 初日だけ 3 つ出すのは、ホームに「新しい 3 つ」を並べる作りにしたため。
-- 1 つしか無い日に開くと、始まったばかりなのが分かるより先に、
-- 過疎っているように見えてしまう。
--
-- 順番は年代順（小学校 → 中学 → 高校 → 二十代）。
-- 一覧が年代ごとにまとまっているので、出る順もそれに合わせると、
-- 上から順に自分の年表をたどっていく形になる。
--
-- 記事（stories）と、それに紐づくお題はこの毎日の流れに乗せない。
-- 3 本しかないので、これまでどおり週 1 本のままにする。

-- =============================================================
-- 1. 二択、1 日 1 問（初日だけ 3 問）
-- =============================================================
with ordered as (
  select
    id,
    row_number() over (
      order by
        case era
          when '小学校' then 1
          when '中学'   then 2
          when '高校'   then 3
          when '社会人' then 4
          else 5
        end,
        sort_index,
        created_at
    ) - 1 as pos
  from public.polls
  where is_active = true
)
update public.polls p
set published_at =
      -- 先頭 3 問は公開日の 0 時。順番が決まるよう秒だけずらす
      case when o.pos < 3
        then timestamptz '2026-08-10 00:00:00+09' + ((2 - o.pos) || ' seconds')::interval
        else timestamptz '2026-08-10 00:00:00+09' + ((o.pos - 2) || ' days')::interval
      end,
    sort_index = o.pos,
    expires_at = null
from ordered o
where p.id = o.id;

-- =============================================================
-- 2. 穴埋めお題、1 日 1 題（初日だけ 3 題）
-- =============================================================
with ordered as (
  select
    t.id,
    row_number() over (
      order by
        case t.era
          when '小学校' then 1
          when '中学'   then 2
          when '高校'   then 3
          when '社会人' then 4
          else 5
        end,
        t.published_at,
        t.created_at
    ) - 1 as pos
  from public.topics t
  where t.is_active = true
    and t.format = 'fill_blank'
    and not exists (select 1 from public.stories s where s.topic_id = t.id)
)
update public.topics t
set published_at =
      case when o.pos < 3
        then timestamptz '2026-08-10 00:00:00+09' + ((2 - o.pos) || ' seconds')::interval
        else timestamptz '2026-08-10 00:00:00+09' + ((o.pos - 2) || ' days')::interval
      end,
    expires_at = null
from ordered o
where t.id = o.id;

-- =============================================================
-- 3. 公開日より前に出るものが無いことを確かめる
-- =============================================================
do $$
declare early int;
begin
  select
    (select count(*) from public.polls
      where is_active and published_at < timestamptz '2026-08-10 00:00:00+09')
  + (select count(*) from public.topics
      where is_active and published_at < timestamptz '2026-08-10 00:00:00+09')
  + (select count(*) from public.stories
      where is_active and published_at < timestamptz '2026-08-10 00:00:00+09')
  into early;

  if early > 0 then
    raise exception '8月10日より前に出るものが % 件残っている', early;
  end if;
end $$;
