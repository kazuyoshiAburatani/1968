-- Supabase Realtime で threads と replies の変更通知を購読できるようにする。
-- supabase_realtime publication に両テーブルを追加することで
-- ブラウザクライアントから postgres_changes を受信可能になる。

alter publication supabase_realtime add table public.threads;
alter publication supabase_realtime add table public.replies;
