-- スレッド削除は運営のみ可能とする方針に変更。
-- 投稿者本人による削除を防ぐため、threads_delete_own ポリシーを撤去する。
-- 運営は service_role 経由（admin 用 Server Action）で削除する。
-- replies の削除も同様の方針が望ましいので、ここでは threads のみ対応、
-- replies の本人削除は当面残す（個別の発言訂正が常識的なので）。

drop policy if exists "threads_delete_own" on public.threads;
