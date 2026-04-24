-- Stripe サブスクリプションの状態をアプリ側で追跡するテーブル。
-- ユーザー 1 人に対して 1 つのアクティブサブスクリプションを想定するが、
-- 履歴として複数行を保持できるよう user_id に UNIQUE を付けない。
-- 「現在の状態」は Webhook が最新化し、users.membership_rank は status と連動する。

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  plan_type text not null check (plan_type in ('regular_monthly', 'regular_yearly')),
  status text not null check (
    status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')
  ),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);

-- updated_at 自動更新
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- RLS
-- 本人は自分のサブスクを閲覧可、書き込みは service_role のみ（Webhook 経由）
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);
