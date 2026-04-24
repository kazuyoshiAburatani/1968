-- 1968 の会員レコード
-- auth.users を補助し、ランク・ステータス・Stripe 顧客IDなどの事業情報を保持する。
-- 認証情報（パスワード、マジックリンクトークン）は auth.users 側で管理する。

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'withdrawn')),
  membership_rank text not null default 'pending'
    check (membership_rank in ('guest', 'pending', 'associate', 'regular')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

comment on table public.users is
  '1968 の会員レコード。auth.users を補助し、ランクとステータスを管理する。';
comment on column public.users.membership_rank is
  'guest=未登録、pending=登録済み未課金、associate=準会員、regular=正会員。pending→associate は Stripe 課金成功で昇格、associate→regular は身分証承認で昇格する。';

-- auth.users に新規行ができた時、public.users に対応行を pending で自動作成する。
-- SECURITY DEFINER により RLS を bypass して INSERT できる。
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, email, membership_rank, status)
  values (new.id, new.email, 'pending', 'active')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- RLS
-- status/membership_rank/stripe_customer_id はシステム管理。ユーザーは自分の行を閲覧だけ可能。
-- INSERT/UPDATE/DELETE のポリシーは作らないため、認証ユーザーからの書き込みは全て拒否される。
-- 書き込みは service_role キー経由（RLS を bypass）か、トリガー（SECURITY DEFINER）のみ。
alter table public.users enable row level security;

create policy "users_select_own"
  on public.users
  for select
  using (auth.uid() = id);
