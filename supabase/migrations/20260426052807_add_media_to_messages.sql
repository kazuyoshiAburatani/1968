-- DM（messages）に画像添付を許可する。
-- 画像本体は post-media バケットを使い回す（既存の RLS で本人のフォルダのみ書き込み可）。
-- text の最低長は 0 まで緩和、画像のみのメッセージを許可する。

alter table public.messages
  add column media jsonb not null default '[]'::jsonb;

-- 「本文 1 文字以上」制約を緩和、画像のみのメッセージを許す
alter table public.messages drop constraint if exists messages_body_check;

alter table public.messages
  add constraint messages_body_or_media_present
  check (
    char_length(body) <= 2000
    and (char_length(body) >= 1 or jsonb_array_length(media) >= 1)
  );
