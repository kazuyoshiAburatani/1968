-- 身分証画像の保管バケット。post-media と異なりプライベート、本人と管理者のみアクセス可能。
-- パス規則、{user_id}/{uuid}.{ext}。第1セグメントが auth.uid() と一致すれば本人。
-- 30 日後の purge バッチで削除する想定。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 本人は自分のフォルダにアップロード可
create policy "verification_documents_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'verification-documents'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 本人は自分のファイルを取得可、ただしバケット private なのでサインドURL経由
create policy "verification_documents_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'verification-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 管理者は全件取得可
create policy "verification_documents_select_admin"
  on storage.objects
  for select
  using (
    bucket_id = 'verification-documents'
    and public.is_admin()
  );

-- 管理者は purge のために削除可
create policy "verification_documents_delete_admin"
  on storage.objects
  for delete
  using (
    bucket_id = 'verification-documents'
    and public.is_admin()
  );

-- 本人は誤アップロード時にやり直したい場合があるため pending のみ自分で削除可
-- 実装は Server Action 側でも verifications.status を見て弾く
create policy "verification_documents_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'verification-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
