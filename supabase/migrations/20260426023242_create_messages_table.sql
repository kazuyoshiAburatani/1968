-- 正会員どうしの 1 対 1 ダイレクトメッセージ（DM）。
-- 設計、
-- ・1 メッセージ = 1 行、シンプルにスレッドではなく時系列のフラット構造
-- ・送信は正会員→正会員のみ、AI ペルソナへは送信不可（双方ランクで判定）
-- ・受信者のみ read_at を更新可能（既読管理）
-- ・運営は service_role 経由で全件閲覧（規約第13条の「三者閲覧」を運用上担保）

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint messages_no_self_dm check (sender_id <> receiver_id)
);

-- 会話相手と時系列でひく主クエリのためのインデックス、最低／最大の 2 列で対称ペアをまとめる
create index messages_pair_time_idx on public.messages (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id),
  created_at desc
);
-- 受信側の未読件数を引きやすく
create index messages_receiver_unread_idx
  on public.messages (receiver_id)
  where read_at is null;
create index messages_sender_idx on public.messages (sender_id);
create index messages_receiver_idx on public.messages (receiver_id);

comment on table public.messages is
  '正会員どうしの 1 対 1 ダイレクトメッセージ。AI ペルソナへの送信は不可。';

-- =======================================
-- RLS
-- =======================================
alter table public.messages enable row level security;

-- 自分が送信者または受信者であるメッセージのみ閲覧可
create policy "messages_select_own_party"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- 送信、自分が送信者かつ送信者・受信者ともに regular、受信者が AI ペルソナでない
create policy "messages_insert_regular_to_regular"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and (
      select membership_rank from public.users where id = auth.uid()
    ) = 'regular'
    and (
      select membership_rank from public.users where id = receiver_id
    ) = 'regular'
    and not coalesce(
      (select is_ai_persona from public.users where id = receiver_id),
      false
    )
  );

-- 受信者は read_at を更新できる（既読化）。送信者の編集は禁止
create policy "messages_update_read_by_receiver"
  on public.messages
  for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- 削除は禁止（規約上、運営による削除のみ service_role 経由）

-- =======================================
-- Realtime、新着メッセージを即座に画面に反映するため
-- =======================================
alter publication supabase_realtime add table public.messages;
