-- 掲示板の画像・動画添付用の Storage バケット。
-- URL は UUID ベースで推測困難、閲覧権限は threads RLS で担保する設計。
-- バケット自体は public にしてサインドURL不要でシンプルに配信する。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects の RLS
-- パス規則、{user_id}/{uuid}.{ext}。第1セグメントがアップロード者の user_id と一致する場合のみ操作可。

create policy "post_media_public_read"
  on storage.objects
  for select
  using (bucket_id = 'post-media');

create policy "post_media_insert_own_folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'post-media'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "post_media_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "post_media_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
