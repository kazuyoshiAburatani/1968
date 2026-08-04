-- Phase 5: プロダクト主軸を「掲示板 → お題ドリブン」にシフト。
-- 50 代非 SNS ネイティブ層にはスレッド + タイトル形式が心理的に重すぎるという判断から、
-- お題への短文レス + 多彩なリアクションで参加ハードルを下げる。
--
-- 追加するもの、
-- 1. topic_responses、お題への短文回答（タイトル無し、100-200 字目安）
-- 2. likes.reaction_type、いいね 1 種類 → 6 種類のリアクション（LINE スタンプ風）
-- 3. likes.target_type に 'topic_response' を追加

-- =============================================================
-- 1. topic_responses、お題への回答
-- =============================================================
create table if not exists public.topic_responses (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 本文、短文投稿を想定するが上限は緩めに 1000 文字（写真だけの投稿も可）
  body text not null default '',
  -- 画像・動画添付、threads.media と同じ MediaItem[] 形式
  media jsonb not null default '[]'::jsonb,
  -- 運営編集メタ、監査用
  admin_edited_at timestamptz,
  admin_edited_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 空投稿禁止、本文か画像のどちらかは必須
  constraint topic_responses_not_empty
    check (char_length(body) >= 1 or jsonb_array_length(media) >= 1)
);

create index if not exists topic_responses_topic_idx
  on public.topic_responses (topic_id, created_at desc);
create index if not exists topic_responses_user_idx
  on public.topic_responses (user_id, created_at desc);

create trigger topic_responses_set_updated_at
  before update on public.topic_responses
  for each row execute function public.set_updated_at();

comment on table public.topic_responses is
  'お題（topics）への短文回答。スレッド作成不要の低ハードル投稿として、掲示板より軽い参加を提供する。';

-- RLS
alter table public.topic_responses enable row level security;

drop policy if exists "topic_responses_select_all" on public.topic_responses;
drop policy if exists "topic_responses_insert_own" on public.topic_responses;
drop policy if exists "topic_responses_update_own" on public.topic_responses;
drop policy if exists "topic_responses_delete_own_or_admin" on public.topic_responses;
drop policy if exists "topic_responses_admin_all" on public.topic_responses;

-- 誰でも読める、お題側の audience 制御でカバー
create policy "topic_responses_select_all" on public.topic_responses
  for select using (true);

-- 認証済ユーザーが自分の投稿を書ける、無料会員も含む
create policy "topic_responses_insert_own" on public.topic_responses
  for insert with check (auth.uid() = user_id);

-- 本人が編集可
create policy "topic_responses_update_own" on public.topic_responses
  for update using (auth.uid() = user_id);

-- 本人 or 運営が削除可
create policy "topic_responses_delete_own_or_admin" on public.topic_responses
  for delete using (auth.uid() = user_id or public.is_admin());

-- 運営は編集も全て可（モデレーション）
create policy "topic_responses_admin_update" on public.topic_responses
  for update using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- 2. likes、リアクション 6 種類に拡張
-- =============================================================
-- 既存 likes は「いいね」1 種類のみ、これを LINE スタンプ的な 6 種類へ。
-- 1 ユーザー 1 ターゲットあたり 1 種類まで（変更は上書き）、
-- 押しやすさと集計の単純さのバランス。

alter table public.likes
  add column if not exists reaction_type text not null default 'like';

-- 反応の種類、
-- like        = いいね (♥)、既存互換の既定
-- understand  = わかる
-- nostalgic   = 懐かしい
-- thanks      = ありがとう
-- agree       = そうそう
-- haha        = 笑（面白い）
alter table public.likes drop constraint if exists likes_reaction_type_check;
alter table public.likes add constraint likes_reaction_type_check
  check (reaction_type in ('like', 'understand', 'nostalgic', 'thanks', 'agree', 'haha'));

-- target_type に 'topic_response' を追加
alter table public.likes drop constraint if exists likes_target_type_check;
alter table public.likes add constraint likes_target_type_check
  check (target_type in ('thread', 'reply', 'topic_response'));

-- 集計高速化用インデックス、reaction カウントを 1 クエリで取れるように
create index if not exists likes_target_type_reaction_idx
  on public.likes (target_type, target_id, reaction_type);
