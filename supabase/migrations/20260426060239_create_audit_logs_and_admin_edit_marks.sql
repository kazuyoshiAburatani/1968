-- 運営操作の監査ログと、運営編集マーク用の列を追加する。
--
-- audit_logs、すべての運営操作を不変記録、後から確認できる
-- threads.admin_edited_at / admin_edited_by、運営編集の有無と実行者を表示するため
-- replies.admin_edited_at / admin_edited_by、同上

-- =======================================
-- 1. audit_logs テーブル
-- =======================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins (id) on delete set null,
  action text not null
    check (action in (
      'thread.edit',
      'thread.delete',
      'reply.edit',
      'reply.delete',
      'verification.approve',
      'verification.reject',
      'user.suspend',
      'user.activate',
      'user.grant_beta',
      'application.approve',
      'application.reject',
      'application.invite',
      'report.handle',
      'other'
    )),
  target_type text not null,
  target_id text,
  target_summary text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index audit_logs_admin_idx on public.audit_logs (admin_id);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);

comment on table public.audit_logs is
  '運営による操作の監査ログ、不変記録。service_role のみ書き込み可、admins のみ閲覧可。';

-- RLS、admins のみ閲覧可、書き込みは service_role 経由
alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin"
  on public.audit_logs
  for select
  using (public.is_admin());

-- =======================================
-- 2. threads / replies に admin_edited マーク列
-- =======================================
alter table public.threads
  add column admin_edited_at timestamptz,
  add column admin_edited_by uuid references public.admins (id) on delete set null;

alter table public.replies
  add column admin_edited_at timestamptz,
  add column admin_edited_by uuid references public.admins (id) on delete set null;

comment on column public.threads.admin_edited_at is
  '運営によって最後に編集された日時、null なら通常編集のみ';
comment on column public.replies.admin_edited_at is
  '運営によって最後に編集された日時、null なら通常編集のみ';
