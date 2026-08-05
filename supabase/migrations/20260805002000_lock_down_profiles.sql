-- 2026-08-05、匿名サインイン有効化に伴う profiles の締め直し。
--
-- 背景。
-- 匿名サインインを有効にすると、匿名ユーザーも `authenticated` ロールを持つ。
-- 従来の profiles の閲覧ポリシーは
--     using (auth.uid() is not null)
-- で、「ログイン済みなら全員のプロフィールを全列読める」という条件だった。
-- 匿名認証を入れる前は「メール認証を通った会員」という関門が効いていたが、
-- いまは誰でも API を 1 回叩けば authenticated セッションを得られるため、
-- この条件は事実上ノーガードになる。
--
-- 実際に匿名セッションで検証したところ、bio_visible が 'members_only' の行まで
-- 生年月日・出身地・学校・職業・自己紹介を含めて読み出せることを確認した。
-- 会員が「公開範囲」を設定しているのに DB 側がそれを無視している状態で、
-- 同学年だけの安心できる場という前提そのものを壊すため、ここで塞ぐ。
--
-- 方針。
--   ・profiles 本体は「自分の行だけ」に限定する
--   ・投稿の表示に必要な列だけを持つビュー profiles_public を公開する
--   ・他人の詳細プロフィール（出身地・学校・職業・自己紹介）は
--     サーバ側で bio_visible を見てから出す。クライアントからは触らせない

-- =============================================================
-- 1. profiles 本体、自分の行だけに限定する
-- =============================================================
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_public_anon" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = user_id);

-- =============================================================
-- 2. 表示用のビュー、投稿カードに出す情報だけ
-- =============================================================
-- 投稿の並びを描くのに要るのは、ニックネーム・アバター・都道府県・学年だけ。
-- 生年月日、出身地の市区町村、学校名、職業、自己紹介はここに含めない。
--
-- security_invoker = false で親テーブルの RLS を迂回する。
-- ビューが返す列そのものを絞ることで安全性を担保する設計なので、これは意図的。
-- （セキュリティアドバイザは security_definer_view として警告を出すが、
--   列を絞ったうえでの公開ビューという用途では想定どおりの構成）
drop view if exists public.profiles_public;

create view public.profiles_public
with (security_invoker = false)
as
select
  p.user_id,
  p.nickname,
  p.avatar_url,
  p.prefecture,
  p.school_year
from public.profiles p;

grant select on public.profiles_public to anon, authenticated;

comment on view public.profiles_public is
  '投稿表示用の公開プロフィール。生年月日・出身地・学校・職業・自己紹介は含めない。'
  ' 他人の詳細はサーバ側で bio_visible を判定してから出すこと。';
