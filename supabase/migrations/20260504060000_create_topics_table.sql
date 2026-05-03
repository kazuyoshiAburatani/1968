-- Phase 3-5: 「今週のお題」機能用 topics テーブル。
-- 運営が定期的に話題提供して、ホーム画面で目立つ位置に表示する。
--
-- スコープ、
-- ・運営のみが投稿、誰でも閲覧可（is_active=true かつ published_at <= now() < expires_at）
-- ・お題は時系列で 1 件だけアクティブ表示するのが基本
-- ・将来は応援団ラウンジ限定のお題なども対応できるよう audience カラムを設けておく

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  audience text not null default 'all'
    check (audience in ('all', 'verified', 'founding', 'supporter')),
  -- 関連カテゴリ、お題タップ時に投稿先誘導するため任意で設定
  related_category_id int references public.categories(id) on delete set null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.admins(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_active_idx on public.topics (
  is_active, published_at desc
) where is_active = true;

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

comment on table public.topics is
  '今週のお題。運営が話題提供してホームに表示する。';

-- =============================================================
-- RLS、運営のみ書き込み、対象 audience に該当するユーザーが閲覧
-- =============================================================
alter table public.topics enable row level security;

-- 再実行性のため既存ポリシーを drop
drop policy if exists "topics_select_public" on public.topics;
drop policy if exists "topics_admin_all" on public.topics;

-- 全員（ゲスト含む）がアクティブな audience='all' のお題を閲覧可
create policy "topics_select_public"
  on public.topics
  for select
  using (
    is_active = true
    and published_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      audience = 'all'
      or (
        audience = 'verified'
        and public.current_user_rank() = 'verified'
      )
      or (
        audience = 'founding'
        and exists (
          select 1 from public.users
          where id = auth.uid() and is_founding_member = true
        )
      )
      or (
        audience = 'supporter'
        and exists (
          select 1 from public.supporters
          where user_id = auth.uid()
            and year = extract(year from now() at time zone 'Asia/Tokyo')::int
        )
      )
      or public.is_admin()
    )
  );

-- 運営は全件閲覧・書込可
create policy "topics_admin_all"
  on public.topics
  for all
  using (public.is_admin())
  with check (public.is_admin());
