-- プロフィールアバター画像の Storage バケット。
-- public で配信、サイズ上限 5MB、画像のみ受け入れる。
-- パス規則、{user_id}/{uuid}.{ext}、本人のみ書き込み可、誰でも閲覧可。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 誰でも閲覧可、public バケットなので URL を組み立てて表示
create policy "profile_avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'profile-avatars');

-- 本人だけが自分のフォルダに upload 可
create policy "profile_avatars_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'profile-avatars'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 本人だけが自分のフォルダの中身を update 可、再アップロード時の上書き
create policy "profile_avatars_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'profile-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 本人だけが削除可、運営は service_role 経由
create policy "profile_avatars_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'profile-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
