-- Phase 4-4: 「みんなの推し」コーナー用 recommendations テーブル。
-- 運営が同年代向けの商品・サービスを紹介、アフィリエイトリンクを含む。
-- ホーム画面と専用ページに表示する。

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'other'
    check (category in (
      'travel', 'caregiving', 'health', 'finance', 'gadget',
      'home', 'fashion', 'book', 'food', 'memorial', 'other'
    )),
  image_url text,
  -- アフィリエイトリンク本体、外部 URL
  affiliate_url text not null,
  affiliate_provider text,
  price_yen int,
  display_order int not null default 100,
  is_active boolean not null default true,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendations_active_idx on public.recommendations (
  is_active, display_order
) where is_active = true;
create index if not exists recommendations_category_idx on public.recommendations (category);

create trigger recommendations_set_updated_at
  before update on public.recommendations
  for each row execute function public.set_updated_at();

comment on table public.recommendations is
  '同年代向け商品・サービスのおすすめ。運営が掲載、アフィリエイト売上を運営費に充当。';

-- =============================================================
-- RLS、誰でもアクティブな項目は閲覧可、書込は運営のみ
-- =============================================================
alter table public.recommendations enable row level security;

-- 再実行性のため既存ポリシーを drop
drop policy if exists "recommendations_select_active" on public.recommendations;
drop policy if exists "recommendations_admin_all" on public.recommendations;

create policy "recommendations_select_active"
  on public.recommendations
  for select
  using (is_active = true or public.is_admin());

create policy "recommendations_admin_all"
  on public.recommendations
  for all
  using (public.is_admin())
  with check (public.is_admin());
