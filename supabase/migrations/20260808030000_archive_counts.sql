-- 2026-08-08、過去の二択とお題を一覧できるようにする。
--
-- これまで、ホームに出なくなった二択はサイト上のどこからも見られなかった。
-- 1 問ごとの URL も無いので、リンクを送ることもできない。
-- 二択は 60 問あって週 2 問ずつ出す想定なので、放っておくと大半が
-- 「一度も見られないまま消えていく在庫」になる。
--
-- 一覧を作るには「その問いに何人が答えたか」が要る。
-- 60 問ぶんの票を毎回ぜんぶ引いて数えると、票が増えたときに一覧が重くなる。
-- 数えるのは Postgres 側に任せて、件数だけを返すビューを置く。

-- =============================================================
-- 二択の集計
-- =============================================================
-- poll_votes 本体は anon から読めないようにしてある（voter_key が入っているため）。
-- ここも security_invoker = false にして、ビュー越しに件数だけを見せる。
create or replace view public.poll_vote_counts
with (security_invoker = false) as
  select
    v.poll_id,
    count(*) as total,
    count(*) filter (where v.choice = 'a') as count_a,
    count(*) filter (where v.choice = 'b') as count_b,
    count(*) filter (where v.choice = 'other') as count_other,
    count(*) filter (
      where (v.comment is not null and length(btrim(v.comment)) > 0)
         or v.image_path is not null
    ) as count_comments
  from public.poll_votes v
  group by v.poll_id;

grant select on public.poll_vote_counts to anon, authenticated;

comment on view public.poll_vote_counts is
  '二択ごとの票数。一覧で「何人が答えたか」を出すために使う。voter_key は含めない。';

-- =============================================================
-- お題の回答数
-- =============================================================
create or replace view public.topic_response_counts
with (security_invoker = false) as
  select
    r.topic_id,
    count(*) as total,
    max(r.created_at) as last_posted_at
  from public.topic_responses r
  group by r.topic_id;

grant select on public.topic_response_counts to anon, authenticated;

comment on view public.topic_response_counts is
  'お題ごとの回答数と最終投稿日時。一覧の並べ替えと件数表示に使う。';
