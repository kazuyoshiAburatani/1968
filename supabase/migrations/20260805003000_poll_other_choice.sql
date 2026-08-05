-- 2026-08-05、二択に「その他」を足す。
--
-- 二択は「どちらかに必ず当てはまる」ことを前提にしていたが、実際には
--   ・どちらの番組も見ていなかった
--   ・その地域には無かった
--   ・買ってもらえなかった
-- のように、どちらも選べない人が必ず出る。
-- 選べないまま素通りされると、その人はそこで参加をやめてしまう。
--
-- 「その他」を受け皿として置き、選んだ人にはコメント欄で
-- 「では何だったか」を書いてもらう。二択に収まらなかった記憶のほうが、
-- かえって場の会話を広げることが多い。
alter table public.poll_votes drop constraint if exists poll_votes_choice_check;

alter table public.poll_votes
  add constraint poll_votes_choice_check
  check (choice in ('a', 'b', 'other'));
