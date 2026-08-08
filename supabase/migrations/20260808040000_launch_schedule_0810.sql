-- 2026-08-08、公開日を 8月10日に定め、配信を年代ごとに組み直す。
--
-- それまでは何も出さない。8月10日より前にサイトを開いた人には、
-- 二択もお題も 1 件も見えない状態にする。
--
-- 出し方は「年代ごとに 1 週間ずつ」。
--   8月10日（月） 小学校のころ   二択16問・お題 9題
--   8月17日（月） 中学のころ     二択20問・お題18題
--   8月24日（月） 高校のころ     二択16問・お題21題
--   8月31日（月） 二十代のころ   二択 8問・お題12題
--
-- なぜ年代ごとか。
-- 初日に全部出すと、その日はたっぷり遊べるが「今週の二択」という
-- 毎週来る理由が消える。逆に週 2 問ずつだと、初日の一覧が数問しかなく、
-- 空いている場に見える。年代でまとめると、初日から一覧が埋まったうえに
-- 「来週は中学の話か」と次が待てる。先に作った年代ごとの一覧が効く。
--
-- 時刻の付け方について。
-- 同じ年代のものに寸分同じ時刻を入れると、ホームの「今週の二択」が
-- どの 2 問になるか毎回変わってしまう（並び順が決まらない）。
-- そこで年代の先頭ほど新しくなるよう、公開時刻を秒単位でずらす。
-- ずれは最大でも 20 秒ほどなので、実際にはどれも「10日の 0 時」に出る。
--
-- 下書きの 20 問（is_active = false、公開日 2099年）はここでは触らない。
-- あれは「まだ出すと決めていない在庫」なので、この予定には乗せない。

-- =============================================================
-- 1. 二択
-- =============================================================
with ordered as (
  select
    id,
    era,
    row_number() over (partition by era order by sort_index, created_at) as rank,
    count(*) over (partition by era) as total
  from public.polls
  where is_active = true and era is not null
)
update public.polls p
set published_at =
      case o.era
        when '小学校' then timestamptz '2026-08-10 00:00:00+09'
        when '中学'   then timestamptz '2026-08-17 00:00:00+09'
        when '高校'   then timestamptz '2026-08-24 00:00:00+09'
        when '社会人' then timestamptz '2026-08-31 00:00:00+09'
      end
      -- 先頭ほど新しくして、ホームに出る順を決めておく
      + ((o.total - o.rank) || ' seconds')::interval,
    expires_at = null
from ordered o
where p.id = o.id;

-- =============================================================
-- 2. 穴埋めお題
-- =============================================================
-- 記事に紐づくお題は、記事と同じ日に出す（下の 3 で扱う）。
with ordered as (
  select
    t.id,
    t.era,
    row_number() over (partition by t.era order by t.published_at, t.created_at) as rank,
    count(*) over (partition by t.era) as total
  from public.topics t
  where t.is_active = true
    and t.era is not null
    and not exists (select 1 from public.stories s where s.topic_id = t.id)
)
update public.topics t
set published_at =
      case o.era
        when '小学校' then timestamptz '2026-08-10 00:00:00+09'
        when '中学'   then timestamptz '2026-08-17 00:00:00+09'
        when '高校'   then timestamptz '2026-08-24 00:00:00+09'
        when '社会人' then timestamptz '2026-08-31 00:00:00+09'
      end
      + ((o.total - o.rank) || ' seconds')::interval,
    expires_at = null
from ordered o
where t.id = o.id;

-- =============================================================
-- 3. 企画記事と、それに紐づくお題
-- =============================================================
-- 記事は 3 本しかないので、年代ではなく 1 週 1 本にする。
-- 読みものの棚が初日から空にならず、そのあと 2 週ぶんの続きも残る。
with ordered as (
  select id, row_number() over (order by published_at, created_at) as rank
  from public.stories
  where is_active = true
)
update public.stories s
set published_at = timestamptz '2026-08-10 00:00:00+09'
                   + ((o.rank - 1) * 7 || ' days')::interval
from ordered o
where s.id = o.id;

-- 記事の投稿欄（紐づくお題）は、記事と同じ瞬間に開く。
-- ずれると、記事は読めるのに書けない、あるいはその逆になる。
update public.topics t
set published_at = s.published_at,
    expires_at = null
from public.stories s
where s.topic_id = t.id and s.is_active = true;

-- =============================================================
-- 4. 確認用
-- =============================================================
-- 8月10日より前に出るものが 1 件も無いことを、移行のたびに見えるようにしておく。
do $$
declare
  early_polls int;
  early_topics int;
  early_stories int;
begin
  select count(*) into early_polls from public.polls
    where is_active and published_at < timestamptz '2026-08-10 00:00:00+09';
  select count(*) into early_topics from public.topics
    where is_active and published_at < timestamptz '2026-08-10 00:00:00+09';
  select count(*) into early_stories from public.stories
    where is_active and published_at < timestamptz '2026-08-10 00:00:00+09';

  if early_polls + early_topics + early_stories > 0 then
    raise exception
      '8月10日より前に出るものが残っている、二択 % / お題 % / 記事 %',
      early_polls, early_topics, early_stories;
  end if;
end $$;
