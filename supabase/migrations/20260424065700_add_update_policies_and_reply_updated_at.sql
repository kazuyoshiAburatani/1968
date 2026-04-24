-- 本人による投稿の編集を許可する。
-- threads と replies に UPDATE RLS を追加し、replies には updated_at を用意する。
-- 列単位の制約は RLS では表現できないため、Server Action 側で許可列のみ更新する設計とする。

-- threads、本人のみ更新可
create policy "threads_update_own"
  on public.threads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- replies、updated_at 列の追加と更新トリガー
alter table public.replies
  add column if not exists updated_at timestamptz not null default now();

create trigger replies_set_updated_at
  before update on public.replies
  for each row execute function public.set_updated_at();

-- replies、本人のみ更新可
create policy "replies_update_own"
  on public.replies
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
