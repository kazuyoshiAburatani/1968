-- 2026-08-08、写真を扱えるようにする。
--
-- 目的はふたつ。
--   1. 二択の選択肢に写真を出す。「りぼん」「なかよし」と字で書かれるより、
--      表紙が並んでいるほうが一瞬で思い出す。写真が無いお題は今までどおり字だけで出す。
--   2. 二択の一言と、お題の回答に、写真を 1 枚添えられるようにする。
--      持っている現物（レコード、下敷き、卒業アルバム）を出せる場をつくる。
--
-- 写真を入れると、これまで無かった種類の事故が起きうる。
-- 誰でも公開バケットにファイルを置ける状態にはしない。以下で入口を全部閉じ、
-- 運営のサーバ側処理（service_role）だけが書き込めるようにする。

-- =============================================================
-- 0. 「席がある人か」を判定する関数
-- =============================================================
-- 登録は Supabase の匿名サインインで行っているので、
-- auth.jwt() の is_anonymous ではメンバーと通りすがりを区別できない。
-- 区別できるのは「profiles に行があるか」だけ。ここが唯一の判定基準になる。
create or replace function public.has_seat()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = auth.uid()
  );
$$;

revoke all on function public.has_seat() from public;
grant execute on function public.has_seat() to anon, authenticated;

comment on function public.has_seat() is
  '席をつくった人（profiles に行がある人）かどうか。匿名サインインを使っているため auth.uid() の有無だけでは判定できない。';

-- =============================================================
-- 1. 二択の選択肢に写真を持たせる
-- =============================================================
-- 値は poll-media バケット内のパス。null なら写真なしで、従来どおり字だけで出す。
alter table public.polls
  add column if not exists option_a_image text,
  add column if not exists option_b_image text;

comment on column public.polls.option_a_image is
  'poll-media バケット内のパス。null なら写真なし（字だけで表示する）。';
comment on column public.polls.option_b_image is
  'poll-media バケット内のパス。null なら写真なし（字だけで表示する）。';

-- 片方だけ写真がある状態は、見た目が崩れるうえに、写真のあるほうが有利になって
-- 集計が歪む。両方あるか、両方無いかのどちらかに限る。
alter table public.polls
  drop constraint if exists polls_option_images_paired;
alter table public.polls
  add constraint polls_option_images_paired check (
    (option_a_image is null) = (option_b_image is null)
  );

-- =============================================================
-- 2. 二択の一言に写真を添えられるようにする
-- =============================================================
-- 値は post-media バケット内のパス。
alter table public.poll_votes
  add column if not exists image_path text;

comment on column public.poll_votes.image_path is
  'post-media バケット内のパス。一言に添えられた写真 1 枚。';

-- =============================================================
-- 3. poll_votes の直読みを止める
-- =============================================================
-- これまで poll_votes は誰でも全列を読めた。voter_key（投票者の識別子）まで
-- 読めてしまうため、他人の識別子を拾ってクッキーに入れれば、その人の票と一言を
-- 上書きできる状態だった。写真が添えられるようになると、他人の名義で写真を
-- 差し替えられることになり、放置できない。
--
-- 集計と一言の表示に必要なのは choice・comment・image_path・created_at だけなので、
-- その 4 つだけを見せるビューを置き、テーブル本体は閉じる。
-- 「自分がどれに入れたか」はサーバ側（service_role）で照合する。
drop policy if exists "poll_votes_select_public" on public.poll_votes;

create or replace view public.poll_votes_public
with (security_invoker = false) as
  select
    v.poll_id,
    v.choice,
    v.comment,
    v.image_path,
    v.created_at
  from public.poll_votes v;

revoke all on public.poll_votes from anon, authenticated;
grant select on public.poll_votes_public to anon, authenticated;

comment on view public.poll_votes_public is
  '二択の集計と一言の表示用。voter_key と user_id を落としてある。';

-- =============================================================
-- 4. poll-media バケット（運営が入れる選択肢の写真）
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'poll-media',
  'poll-media',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "poll_media_public_read" on storage.objects;
create policy "poll_media_public_read" on storage.objects
  for select using (bucket_id = 'poll-media');

-- 書き込みポリシーは意図的に作らない。
-- 選択肢の写真は管理画面から service_role 経由でのみ入る。

-- =============================================================
-- 5. post-media を締める
-- =============================================================
-- 掲示板があった頃の名残で、動画 50MB まで受け付ける設定と、
-- 「ログインしていれば自分のフォルダに置ける」という書き込みポリシーが残っていた。
--
-- いま登録は匿名サインインなので、この条件は「サイトを開いた人なら誰でも」と同義になる。
-- ニックネームも生年月日も出さずに、公開バケットへ 50MB の動画を置けてしまう。
-- 掲示板はもう無く、動画を受ける場所も無いので、画像 5MB に絞り、
-- クライアントからの書き込み口は閉じる。投稿はすべてサーバ側の処理を通す。
update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
  file_size_limit = 5242880
where id = 'post-media';

drop policy if exists "post_media_insert_own_folder" on storage.objects;
drop policy if exists "post_media_update_own" on storage.objects;
-- 自分のフォルダのものを消す権利は残す（パスの先頭が自分の user_id のときだけ）。
-- post_media_public_read と post_media_delete_own はそのまま。

-- =============================================================
-- 6. アバターと身分証バケットの書き込み口も同じ理由で締める
-- =============================================================
-- アバターは本人がマイページから入れるので書き込み口は残すが、
-- 「席がある人」に限る。通りすがりの匿名セッションからは入れられないようにする。
drop policy if exists "profile_avatars_insert_own" on storage.objects;
create policy "profile_avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'profile-avatars'
    and public.has_seat()
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "profile_avatars_update_own" on storage.objects;
create policy "profile_avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'profile-avatars'
    and public.has_seat()
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 身分証の提出はもう受け付けていない。書き込み口を残す理由がない。
drop policy if exists "verification_documents_insert_own" on storage.objects;
