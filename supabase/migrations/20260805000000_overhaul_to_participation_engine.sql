-- 2026-08-05、参加ハードル最小化への全面移行。
--
-- 6 ペルソナの仮想ロープレ検証（docs/施策検証レポート-2026-08.md）で、
-- 現状サイトは全員が 90 秒以内に離脱し、死因は
--   1. 「回答 0 件・会員 2 名」の過疎が可視化されていること
--   2. 投稿にメール認証登録が必須であること
--   3. 「身分証」の文字が警戒を確定させること
-- であると判明した。合格した施策だけを残し、それ以外を撤去する。
--
-- このマイグレーションで行うこと、
--   A. 対象範囲を「昭和43年度生まれ（1968年に生まれた学年）」へ拡張、早生まれ問題の解消
--   B. 不要機能の撤去、掲示板 / DM / 身分証確認 / 課金（Stripe・応援団）
--   C. お題（topics）を穴埋め形式に対応、運営返信と「今週のお便り紹介」を追加
--   D. 二択投票（polls / poll_votes）を新設、ゲストが 1 タップで参加できる
--   E. 検定クイズ（quiz_questions / quiz_attempts）を新設
--   F. 年表イベント（timeline_events）を新設、「今日は何の日」もここから引く
--   G. 企画記事（stories）を新設、コメント欄は topic_responses を再利用
--   H. 匿名認証（ニックネーム＋生年月日だけの 30 秒登録）に対応

-- =============================================================
-- A. 学年拡張、1968年1月1日〜1969年4月1日生まれを受け入れる
-- =============================================================
-- 従来は birth_year = 1968 固定だったため、同じ学年（昭和43年度）の
-- 1969年1〜3月生まれ（早生まれ）が登録できなかった。
-- ロープレでは、これが「私の同級生の大半が入れない」という疎外感と、
-- シェア先の同学年グループが対象外という構造矛盾を生んでいた。
alter table public.profiles drop constraint if exists profiles_birth_year_check;

alter table public.profiles
  add constraint profiles_birth_year_check
  check (
    birth_year = 1968
    or (
      birth_year = 1969
      and (birth_month < 4 or (birth_month = 4 and birth_day = 1))
    )
  );

-- 学年（年度）を保持する。4月2日〜翌4月1日が同じ学年。
--   1968年1月1日〜1968年4月1日 → 1967（昭和42年度、ひとつ上の学年）
--   1968年4月2日〜1969年4月1日 → 1968（昭和43年度、中核の学年）
-- 生成列にすることで、アプリ側の計算ミスで学年がズレることを防ぐ。
alter table public.profiles
  add column if not exists school_year int
  generated always as (
    case
      when birth_month < 4 or (birth_month = 4 and birth_day <= 1)
        then birth_year - 1
      else birth_year
    end
  ) stored;

comment on column public.profiles.school_year is
  '学年（年度）。4月2日〜翌4月1日が同学年。1968 = 昭和43年度がこのサービスの中核。';

-- =============================================================
-- B-1. 掲示板（threads / replies / categories）の撤去
-- =============================================================
-- スレッド＋タイトル形式は 50 代には心理的に重く、ロープレでも一度も使われなかった。
-- お題・投票・企画記事に一本化する。

-- likes から掲示板向けの行を削除してから target_type を絞る
delete from public.likes where target_type in ('thread', 'reply');

-- スレッド・返信のカウンタを更新していたトリガーを先に外す。
-- 参照先テーブルが消えると実行時に必ず失敗するため、関数ごと撤去する。
drop trigger if exists likes_count_change on public.likes;
drop function if exists public.handle_like_count_change() cascade;
drop function if exists public.handle_reply_count_change() cascade;

-- topics がカテゴリを参照しているため、先に外す
alter table public.topics drop column if exists related_category_id;

drop table if exists public.replies cascade;
drop table if exists public.threads cascade;
drop table if exists public.categories cascade;

alter table public.likes drop constraint if exists likes_target_type_check;
alter table public.likes
  add constraint likes_target_type_check
  check (target_type in ('topic_response'));

-- 閲覧数カウント用 RPC とラウンジ判定はスレッド・カテゴリ専用だったので撤去
drop function if exists public.increment_thread_view(uuid);
drop function if exists public.can_access_lounge(integer);

-- =============================================================
-- B-2. DM（messages）の撤去
-- =============================================================
-- 6 ペルソナ全員が一度も使わず、恋愛目的の勧誘リスクだけが残るため撤去する。
-- 運営とのやり取りは「お題への運営返信」に一本化する。
drop table if exists public.messages cascade;

-- =============================================================
-- B-3. 身分証確認（verifications）の撤去
-- =============================================================
-- 最も課金意欲の高い層（金融機関勤務・介護前夜の女性）を弾いていた要因。
-- 「身分証の写真を送れ」はフィッシングの手口そのもので、職業倫理上どうしても越えられない壁だった。
drop table if exists public.verifications cascade;

-- Storage、身分証バケットは中身ごと削除する。
-- ただし storage.objects / storage.buckets への直接 DELETE は Supabase 側のガード
-- （storage.protect_delete）で拒否されるため、SQL からは消せない。
-- verification-documents バケットは Storage API（管理画面、または service_role の
-- クライアント）から中身を空にしたうえで削除すること。
--   delete from storage.objects where bucket_id = 'verification-documents';
--   delete from storage.buckets where id = 'verification-documents';

-- =============================================================
-- B-4. 課金（subscriptions / supporters / Stripe）の撤去
-- =============================================================
drop table if exists public.subscriptions cascade;
drop table if exists public.supporters cascade;

alter table public.users drop column if exists stripe_customer_id;

-- =============================================================
-- B-5. ランクを guest / member の 2 値に単純化
-- =============================================================
-- 'verified'（身分証承認済）は撤去に伴い消滅。登録すれば全員 member。
-- 「創設メンバー」は称号として残し、種火メンバーの可視化に使う。
update public.users set membership_rank = 'member' where membership_rank <> 'member';

alter table public.users drop constraint if exists users_membership_rank_check;
alter table public.users
  add constraint users_membership_rank_check
  check (membership_rank in ('member'));

alter table public.users drop column if exists verified;

-- ランク再計算まわりの関数とトリガーを一括で撤去する。
-- subscriptions / verifications / beta 付与のいずれもランクに影響しなくなった。
drop function if exists public.subscriptions_refresh_rank() cascade;
drop function if exists public.sync_user_verified() cascade;
drop function if exists public.users_beta_refresh_rank() cascade;
drop function if exists public.compute_membership_rank(uuid) cascade;
drop function if exists public.refresh_user_rank(uuid) cascade;

-- RLS で参照される current_user_rank は、登録済みなら member を返すだけにする
create or replace function public.current_user_rank()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null then 'guest'
    else 'member'
  end;
$$;

-- =============================================================
-- C. お題（topics）を穴埋め形式へ拡張
-- =============================================================
-- 「自由に書いて」ではなく「型に沿って 1 行だけ」の方が投稿が出る。
-- らくらくコミュニティ（220万人、1日3.5万投稿）の利用者の声は
-- 「テーマがあり、定型に従って投稿すればよいので続けやすい」。
alter table public.topics
  add column if not exists format text not null default 'free',
  add column if not exists blank_examples jsonb not null default '[]'::jsonb,
  add column if not exists era text,
  add column if not exists gender_lean text not null default 'both';

alter table public.topics drop constraint if exists topics_format_check;
alter table public.topics
  add constraint topics_format_check check (format in ('free', 'fill_blank'));

alter table public.topics drop constraint if exists topics_gender_lean_check;
alter table public.topics
  add constraint topics_gender_lean_check
  check (gender_lean in ('male', 'female', 'both'));

comment on column public.topics.format is
  'free = 自由記述、fill_blank = 穴埋め一行。fill_blank は title に【　】を含める。';
comment on column public.topics.blank_examples is
  '穴埋めの回答例（文字列配列）。入力欄のプレースホルダに使い、具体的なほど投稿率が上がる。';

-- audience を単純化、'verified' / 'supporter' は撤去済みなので 'all' / 'founding' のみ
update public.topics set audience = 'all' where audience in ('verified', 'supporter');
alter table public.topics drop constraint if exists topics_audience_check;
alter table public.topics
  add constraint topics_audience_check check (audience in ('all', 'founding'));

drop policy if exists "topics_select_public" on public.topics;
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
        audience = 'founding'
        and exists (
          select 1 from public.users
          where id = auth.uid() and is_founding_member = true
        )
      )
      or public.is_admin()
    )
  );

-- =============================================================
-- C-2. 運営返信（ラジオDJ方式）と「今週のお便り紹介」
-- =============================================================
-- 定着装置として最も効いた施策。返信の固有名詞密度が命で、
-- 「素敵な思い出ですね！」のような定型文は一発でテンプレと見抜かれて逆効果になる。
alter table public.topic_responses
  add column if not exists is_operator boolean not null default false,
  add column if not exists featured_at timestamptz,
  add column if not exists featured_note text;

comment on column public.topic_responses.is_operator is
  '運営（管理人）からの返信。投稿者に必ず返事が届く体験を作るための旗。';
comment on column public.topic_responses.featured_at is
  '「今週のお便り紹介」に採用した日時。ラジオのハガキ採用にあたる承認装置。';

create index if not exists topic_responses_featured_idx
  on public.topic_responses (featured_at desc)
  where featured_at is not null;

-- 運営が未返信の投稿を素早く引くための部分インデックス
create index if not exists topic_responses_toplevel_created_idx
  on public.topic_responses (created_at desc)
  where parent_response_id is null;

-- =============================================================
-- D. 二択投票（polls / poll_votes）
-- =============================================================
-- 初回参加スコア 8.8/10 で全ペルソナが参加した唯一の施策。
-- 登録不要・1 タップ・得票率が即座に見えることが要件。
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  option_a text not null,
  option_b text not null,
  -- 投票後に出す一言解説、当時の背景を添えて会話のきっかけにする
  blurb text not null default '',
  era text,
  gender_lean text not null default 'both'
    check (gender_lean in ('male', 'female', 'both')),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  -- 出題順、運営が男女ネタを交互に並べるために使う
  sort_index int not null default 0,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists polls_active_idx
  on public.polls (is_active, published_at desc)
  where is_active = true;

create trigger polls_set_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at();

comment on table public.polls is
  '二択の派閥投票。ゲストでも 1 タップで参加でき、投票直後に世代内の得票率を返す。';

-- 投票、voter_key はログイン中なら user_id、未ログインならサーバが発行した匿名クッキーの UUID。
-- 同じ設問に 1 回だけ、変更は上書き。
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter_key uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  choice text not null check (choice in ('a', 'b')),
  -- 任意の一言コメント、投票の 1 タップから会話へ橋渡しする
  comment text,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_key),
  constraint poll_votes_comment_len check (char_length(coalesce(comment, '')) <= 200)
);

create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_comment_idx
  on public.poll_votes (poll_id, created_at desc)
  where comment is not null;

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists "polls_select_public" on public.polls;
drop policy if exists "polls_admin_all" on public.polls;
drop policy if exists "poll_votes_select_public" on public.poll_votes;
drop policy if exists "poll_votes_admin_all" on public.poll_votes;

-- 誰でも（ゲスト含む）公開中の設問を読める
create policy "polls_select_public"
  on public.polls
  for select
  using (
    (is_active = true
     and published_at <= now()
     and (expires_at is null or expires_at > now()))
    or public.is_admin()
  );

create policy "polls_admin_all"
  on public.polls
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 集計と一言コメントの表示のため、投票は誰でも読める
create policy "poll_votes_select_public"
  on public.poll_votes
  for select
  using (true);

-- 書き込みポリシーは意図的に作らない。
-- 投票は Server Action から service_role で行い、voter_key は httpOnly クッキーで
-- サーバが発行する。anon に直接 insert を許すと票の水増しが容易になるため。
create policy "poll_votes_admin_all"
  on public.poll_votes
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- E. 検定クイズ（quiz_questions / quiz_attempts）
-- =============================================================
-- 拡散装置。男子文化に偏ると女性が「私は本物じゃない側」に置かれて離脱するため、
-- gender_lean を必ず持たせ、出題時に男女半々で混ぜる。
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  choices jsonb not null,
  answer_index int not null check (answer_index >= 0),
  explanation text not null default '',
  era text,
  gender_lean text not null default 'both'
    check (gender_lean in ('male', 'female', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint quiz_questions_choices_len
    check (jsonb_array_length(choices) between 2 and 6)
);

create index if not exists quiz_questions_active_idx
  on public.quiz_questions (is_active, gender_lean)
  where is_active = true;

comment on table public.quiz_questions is
  '昭和43年度生まれ検定。体験していないと解けない問題だけを載せる（検索で解ける知識問題は不可）。';

-- 挑戦結果、平均点の表示と難易度調整に使う。個人の特定はしない。
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  voter_key uuid,
  user_id uuid references auth.users(id) on delete set null,
  score int not null check (score >= 0),
  total int not null check (total > 0),
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_created_idx
  on public.quiz_attempts (created_at desc);

alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "quiz_questions_select_public" on public.quiz_questions;
drop policy if exists "quiz_questions_admin_all" on public.quiz_questions;
drop policy if exists "quiz_attempts_select_public" on public.quiz_attempts;
drop policy if exists "quiz_attempts_admin_all" on public.quiz_attempts;

create policy "quiz_questions_select_public"
  on public.quiz_questions
  for select
  using (is_active = true or public.is_admin());

create policy "quiz_questions_admin_all"
  on public.quiz_questions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 平均点の集計に使うため読み取りは公開、書き込みは service_role のみ
create policy "quiz_attempts_select_public"
  on public.quiz_attempts
  for select
  using (true);

create policy "quiz_attempts_admin_all"
  on public.quiz_attempts
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- F. 年表イベント（timeline_events）
-- =============================================================
-- 「あなたが中2のとき、明菜がデビューした」の自分年表と、
-- LINE 配信「今日は何の日」の両方をこの 1 テーブルから引く。
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null,
  -- 「あなたが〇〇のとき」の主語になる一文
  note text not null default '',
  genre text,
  gender_lean text not null default 'both'
    check (gender_lean in ('male', 'female', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists timeline_events_date_idx
  on public.timeline_events (event_date);

-- 「今日は何の日」用、月日で引くための式インデックス
create index if not exists timeline_events_monthday_idx
  on public.timeline_events (
    (extract(month from event_date)),
    (extract(day from event_date))
  );

comment on table public.timeline_events is
  '年表イベント。自分年表ジェネレータと「今日は何の日1968」の共通データ源。';

alter table public.timeline_events enable row level security;

drop policy if exists "timeline_events_select_public" on public.timeline_events;
drop policy if exists "timeline_events_admin_all" on public.timeline_events;

create policy "timeline_events_select_public"
  on public.timeline_events
  for select
  using (is_active = true or public.is_admin());

create policy "timeline_events_admin_all"
  on public.timeline_events
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- G. 企画記事（stories）「あの店・あの商品、今どうなってる？」
-- =============================================================
-- 唯一、自発的な長文投稿と会員同士の返信が発生した施策。
-- コメント欄は専用テーブルを作らず topic_responses を再利用する
-- （記事ごとに裏で 1 件の topic を持たせる）。
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  -- 一覧に出すリード文
  lead text not null default '',
  body text not null default '',
  hero_image_url text,
  -- 読者投稿を受け付けるお題、記事公開時に自動生成する
  topic_id uuid references public.topics(id) on delete set null,
  published_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stories_slug_format check (slug ~ '^[a-z0-9-]{1,80}$')
);

create index if not exists stories_active_idx
  on public.stories (is_active, published_at desc)
  where is_active = true;

create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

comment on table public.stories is
  '「あの店・あの商品、今どうなってる？」の企画記事。読者投稿は topic_id 経由で topic_responses に入る。';

alter table public.stories enable row level security;

drop policy if exists "stories_select_public" on public.stories;
drop policy if exists "stories_admin_all" on public.stories;

create policy "stories_select_public"
  on public.stories
  for select
  using (
    (is_active = true and published_at <= now())
    or public.is_admin()
  );

create policy "stories_admin_all"
  on public.stories
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- H. 匿名認証への対応
-- =============================================================
-- 「ニックネーム＋生年月日」だけの 30 秒登録を主軸にする。
-- Supabase の匿名サインインでは auth.users.email が null になるため、
-- public.users.email を nullable にし、トリガーも null 安全にする。
alter table public.users alter column email drop not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_beta_invited boolean := false;
begin
  -- 匿名サインインでは email が null。その場合はベータ招待の照合をしない。
  if new.email is not null and length(new.email) > 0 then
    select exists (
      select 1 from public.beta_applications
      where lower(email) = lower(new.email)
        and status in ('invited', 'approved')
    ) into is_beta_invited;
  end if;

  insert into public.users (
    id,
    email,
    membership_rank,
    status,
    is_founding_member,
    founding_member_since
  )
  values (
    new.id,
    new.email,
    'member',
    'active',
    coalesce(is_beta_invited, false),
    case when is_beta_invited then now() else null end
  )
  on conflict (id) do nothing;

  if is_beta_invited then
    update public.beta_applications
      set status = 'registered',
          registered_user_id = new.id
      where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

-- 匿名ユーザーがあとからメールを紐付けた（本登録した）ときに
-- public.users.email を追随させる。端末変更後の引き継ぎ導線で使う。
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.users set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_user_email();

-- =============================================================
-- I. ヘッダー用 RPC を新構成に合わせて作り直す
-- =============================================================
-- 旧版は messages / threads / replies を参照していたが、いずれも撤去済み。
-- 未読は「自分の投稿への返信（運営返信を含む）」と「お便り紹介への採用」で数える。
drop function if exists public.get_session_header_context(uuid);

create function public.get_session_header_context(p_user_id uuid)
returns table (
  membership_rank text,
  nickname text,
  avatar_url text,
  is_admin boolean,
  is_founding_member boolean,
  school_year int,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with u as (
    select
      coalesce(membership_rank, 'member') as rank,
      coalesce(last_notifications_seen_at, '1970-01-01'::timestamptz) as last_seen_at,
      coalesce(is_founding_member, false) as founding
    from public.users where id = p_user_id
  ),
  prof as (
    select nickname, avatar_url, school_year
    from public.profiles where user_id = p_user_id
  ),
  adm as (
    select 1 as flag from public.admins where user_id = p_user_id limit 1
  ),
  my_responses as (
    select id from public.topic_responses where user_id = p_user_id
  ),
  unread_replies as (
    select count(*) as c
    from public.topic_responses r
    where r.parent_response_id in (select id from my_responses)
      and r.user_id <> p_user_id
      and r.created_at > (select last_seen_at from u)
  ),
  unread_featured as (
    select count(*) as c
    from public.topic_responses r
    where r.user_id = p_user_id
      and r.featured_at is not null
      and r.featured_at > (select last_seen_at from u)
  )
  select
    (select rank from u) as membership_rank,
    (select nickname from prof) as nickname,
    (select avatar_url from prof) as avatar_url,
    coalesce((select true from adm), false) as is_admin,
    coalesce((select founding from u), false) as is_founding_member,
    (select school_year from prof) as school_year,
    coalesce((select c from unread_replies), 0) +
      coalesce((select c from unread_featured), 0) as unread_count;
$$;

grant execute on function public.get_session_header_context(uuid) to authenticated, anon;

-- =============================================================
-- J. member_display ビューを作り直す（supporters 撤去に追随）
-- =============================================================
drop view if exists public.member_display;

create view public.member_display
with (security_invoker = false)
as
select
  u.id as user_id,
  u.membership_rank,
  u.is_ai_persona,
  u.is_founding_member
from public.users u;

grant select on public.member_display to anon, authenticated;

-- =============================================================
-- K. 投稿の集計ビュー、ホームの「賑わい」表示に使う
-- =============================================================
-- 「回答 0 件」を人目に晒さないため、運営が状況を把握できるようにする。
create or replace view public.participation_stats
with (security_invoker = false)
as
select
  (select count(*) from public.users) as member_count,
  (select count(*) from public.topic_responses) as response_count,
  (select count(*) from public.poll_votes) as vote_count,
  (select count(*) from public.topic_responses where created_at > now() - interval '7 days')
    as responses_last_7d;

grant select on public.participation_stats to anon, authenticated;
