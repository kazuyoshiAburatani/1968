-- Phase 3-4: 油谷さん直通チャンネル のため、messages の insert RLS を更新。
--
-- 新ルール、
-- ・通常 DM は両者とも 'verified' 必須（旧 'regular' をリネーム）
-- ・受信者が運営（admins.role IN ('super_admin','moderator','support')）の場合、
--   送信者が verified or 創設メンバー or 当年の応援団 ならば送信可
-- ・運営自身は誰にでも返信可（送信者が運営なら無条件）
-- ・受信者が AI ペルソナの場合は引き続き禁止

drop policy if exists "messages_insert_regular_to_regular" on public.messages;

create policy "messages_insert_verified_or_operator"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and not coalesce(
      (select is_ai_persona from public.users where id = receiver_id),
      false
    )
    and (
      -- 運営は誰にでも返信可
      public.is_admin()
      -- 受信者が運営、送信者が一定条件を満たす（直通チャンネル）
      or (
        exists (
          select 1 from public.admins where user_id = receiver_id
        )
        and (
          (select membership_rank from public.users where id = auth.uid()) = 'verified'
          or coalesce(
            (select is_founding_member from public.users where id = auth.uid()),
            false
          )
          or exists (
            select 1 from public.supporters
            where user_id = auth.uid()
              and year = extract(year from now() at time zone 'Asia/Tokyo')::int
          )
        )
      )
      -- 通常の DM、両者 verified
      or (
        (select membership_rank from public.users where id = auth.uid()) = 'verified'
        and (select membership_rank from public.users where id = receiver_id) = 'verified'
      )
    )
  );
