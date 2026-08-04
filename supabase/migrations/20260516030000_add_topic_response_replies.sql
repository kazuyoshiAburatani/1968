-- Phase 5-2: topic_responses に返信ツリーを追加。
-- 「全ての回答にはいいねがつけることができるし返信できる」フィードバックから、
-- 各回答に対する 1 階層の返信を自己参照で持てるようにする。
--
-- 親レスは parent_response_id が NULL、返信は parent_response_id に親 ID を持つ。
-- 削除時は ON DELETE CASCADE で親削除→返信も削除。

alter table public.topic_responses
  add column if not exists parent_response_id uuid
  references public.topic_responses(id) on delete cascade;

-- 返信一覧を parent ごとに時系列で引くためのインデックス
create index if not exists topic_responses_parent_idx
  on public.topic_responses (parent_response_id, created_at asc)
  where parent_response_id is not null;

-- トップレベル回答だけを取り出すクエリを速くするための部分インデックス
create index if not exists topic_responses_toplevel_idx
  on public.topic_responses (topic_id, created_at desc)
  where parent_response_id is null;

comment on column public.topic_responses.parent_response_id is
  '親レス ID。NULL ならトップレベル回答、値ありなら返信。';
