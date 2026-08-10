-- 受け入れる学年を 3 学年に広げる。
--
-- これまでは昭和43年度（1968年度）だけが対象で、profiles の制約も
-- 「1968年生まれ、または1969年1月1日〜4月1日生まれ」に固定されていた。
-- 2026-08-10、中心は 1968年度のまま、ひとつ上（昭和42年度）と
-- ひとつ下（昭和44年度）まで入れるようにする。
--
-- 1 学年だけだと母数が薄く、立ち上げ期に「回答 0 件」が人目に触れやすい。
-- 前後 1 学年は、小中高で同じ校舎にいた相手なので、同じ話が通じる。
--
-- 受け入れ範囲、1967年4月2日 〜 1970年4月1日。
-- 境目が 4月1日 / 4月2日 なのは、4月1日生まれが早生まれ扱いになるため。
--
-- **この式は lib/school-year.ts の isAcceptedBirthday と同じ形で書いてある。**
-- 片方だけ直すと、画面の検証は通るのに保存で落ちる、という最悪の壊れ方をする。

alter table public.profiles
  drop constraint if exists profiles_birth_year_check;

alter table public.profiles
  drop constraint if exists profiles_birth_date_range_check;

alter table public.profiles
  add constraint profiles_birth_date_range_check
  check (
    (birth_year * 10000 + birth_month * 100 + birth_day) between 19670402 and 19700401
  );

comment on constraint profiles_birth_date_range_check on public.profiles is
  '受け入れる生年月日、1967-04-02〜1970-04-01（昭和42・43・44年度生まれの3学年）。lib/school-year.ts の isAcceptedBirthday と同じ式';

-- school_year 生成列は年に依存しない式（4月1日以前なら前年）なので、そのままで 3 学年を正しく返す。
-- 念のため、境目の日が期待どおりに割り振られることをここで確かめておく。
do $$
declare
  v record;
begin
  for v in
    select *
    from (values
      (1967, 4, 1, 1966), -- 範囲の 1 日手前。学年としては昭和41年度
      (1967, 4, 2, 1967), -- 昭和42年度のはじまり
      (1968, 4, 1, 1967), -- 早生まれ、ひとつ上の学年
      (1968, 4, 2, 1968), -- 昭和43年度のはじまり
      (1969, 4, 1, 1968), -- 早生まれ、中心の学年
      (1969, 4, 2, 1969), -- 昭和44年度のはじまり
      (1970, 4, 1, 1969)  -- 早生まれ、ひとつ下の学年。範囲の最後
    ) as t(y, m, d, expected)
  loop
    if (case when v.m < 4 or (v.m = 4 and v.d <= 1) then v.y - 1 else v.y end) <> v.expected then
      raise exception '学年計算がずれている: %-%-% は % のはずだった', v.y, v.m, v.d, v.expected;
    end if;
  end loop;
end $$;

-- ベータ応募（創設メンバー招待に転用している）も同じ範囲に合わせる。
-- ここを直し忘れると、/beta の画面は 1967〜1970 年を選べるのに保存で落ちる。
alter table public.beta_applications
  drop constraint if exists beta_applications_birth_year_check;

alter table public.beta_applications
  drop constraint if exists beta_applications_birth_date_range_check;

alter table public.beta_applications
  add constraint beta_applications_birth_date_range_check
  check (
    (birth_year * 10000 + birth_month * 100 + birth_day) between 19670402 and 19700401
  );

-- 学年の節目を timeline_events から外す。
--
-- この 7 行は 1968年度生まれ 1 学年だけを前提に、入学・卒業・成人式・入社を
-- 実年月日で直接持っていた。ところが同じ節目は `milestonesFor()` が
-- **その人の学年から計算して**必ず生成するので、自分年表では最初から二重に出ていた
-- （1968年度の人にも「小学校に入学」が 2 行並んでいた）。
--
-- 対象を 3 学年に広げると、これは重複では済まなくなる。
-- 昭和42年度の人の年表に「あなたが小学2年生のとき、小学校に入学」と出てしまう。
-- 学年計算が合っているかどうかは、この層が最初に確かめる一点なので、致命傷になる。
--
-- 節目は milestonesFor() だけが持つことにして、表からは落とす。
-- 1987-04-01 の「大学に入学、または社会人1年目」も milestonesFor() に移してある。
delete from public.timeline_events
where (event_date, title) in (
  ('1975-04-01', '小学校に入学'),
  ('1981-04-01', '中学校に入学'),
  ('1984-04-01', '高校に入学'),
  ('1987-03-01', '高校を卒業'),
  ('1987-04-01', '大学に入学、または社会人1年目が始まる'),
  ('1989-01-15', 'あなたたちの成人式'),
  ('1991-04-01', '大学を卒業して入社、バブル最末期の入社式')
);

-- 年表の一文から、学年の言い回しを外す。
--
-- 113 件すべての note が「あなたが小5の夏。」のように、
-- **1968年度生まれの学年**を決め打ちした一文で始まっていた。
-- 画面はこれとは別に、その人の生年月日から計算した
-- 「あなたが小学2年生のとき」（whenPhrase）を必ず添えて出す。
-- 1 学年しか居なかったあいだは両方が一致していたので問題にならなかったが、
-- 3 学年になった瞬間、昭和42年度の人の画面には
--
--   1975年4月5日 ゴレンジャー放送開始
--   あなたが小学2年生のとき。 あなたが小1になった直後。
--
-- という、真っ向から食い違う 2 行が並ぶ。
-- 早生まれの層がまず確かめるのがここで、ズレていれば二度と来ない。
--
-- note は出来事そのものだけを語り、学年は whenPhrase に任せる。
-- 先頭の「あなた〜。」を落とすだけで、残りはそのまま読める文になる
-- （全 113 件で確認済み。空になる行は無い）。
update public.timeline_events
set note = regexp_replace(note, '^あなた[^。]*。\s*', '')
where note ~ '^あなた[^。]*。';

-- 見出しにも 1 学年決め打ちが 1 件だけ残っていた。
update public.timeline_events
set title = 'この学年が、五十代の後半にさしかかる年度'
where event_date = '2026-04-01'
  and title = '昭和43年度生まれが57歳・58歳になる年度';

-- 1 件だけ、学年を数えて書いてある一文が残る。
-- 共通一次からセンター試験への切り替わりは 1990年1月で、
-- 「3学年下」が正しいのは 1968年度生まれから見たときだけ
-- （昭和42年度なら4学年下、昭和44年度なら2学年下になる）。
-- 学年を数えない書き方に直す。
update public.timeline_events
set note = '共通一次が、この年から「センター試験」に名前を変えた。'
where event_date = '1990-01-13'
  and title = '第1回 大学入試センター試験';
