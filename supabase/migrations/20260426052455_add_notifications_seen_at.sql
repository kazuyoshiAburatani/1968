-- 通知の未読カウントは、users.last_notifications_seen_at 以降に発生した
-- replies / likes / messages の件数で計算する。
-- 通知テーブルを作る方が拡張性は高いが、最初は最小実装でこの方式とする。

alter table public.users
  add column last_notifications_seen_at timestamptz;
