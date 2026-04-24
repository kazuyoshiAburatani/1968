-- プロフィールの閲覧ポリシーを掲示板向けに緩和する。
-- 投稿にはニックネームの表示が付随するため、ログイン済みであれば全プロフィールを
-- 読める状態にする。詳細プロフィールページ（/u/[id]）の開示制御は
-- アプリ層で bio_visible を参照して行う。

drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_select_members_only" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;

-- ログイン済みユーザーはすべてのプロフィールを閲覧可
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  using (auth.uid() is not null);

-- 未ログインユーザーは bio_visible=public のプロフィールだけ閲覧可
create policy "profiles_select_public_anon"
  on public.profiles
  for select
  using (bio_visible = 'public');
