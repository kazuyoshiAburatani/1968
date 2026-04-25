-- 12 カテゴリを「同年代ならではの懐かしいテーマ」に刷新する。
-- 細分化前の入口話題として、80 年代カルチャーや昭和の暮らしを軸にする。
-- スレッド／返信は category_id を経由して紐づくため、ID をそのまま流用して内容だけ更新する。
--
-- 新構成、
-- A 段階（ゲスト閲覧可・無料会員投稿可）、ノスタルジア系の入口
--   1. アニメ・特撮の名作
--   2. 歌謡曲・あの頃の音楽
--   3. テレビ・ドラマの記憶
--   4. 駄菓子・給食・あの味
-- B 段階（無料会員閲覧可・正会員投稿可）、思い出を深掘りする
--   5. 子供の頃の遊び・流行り物
--   6. 死語・流行語・あの頃の言葉
--   7. 学校生活・先生・部活
--   8. バブル・社会人デビュー
-- C 段階（正会員のみ）、地に足ついた今の話
--   9. 家族のはなし
--  10. 今の暮らし・健康のこと
--  11. 仕事・お金・老後の設計
-- D 段階（正会員＋3ヶ月以上）
--  12. オフ会・集まり

-- まず A 段階の 4 カテゴリ、guest 閲覧 / member 投稿 / 1日3件
update public.categories
set slug = 'retro-anime',
    name = 'アニメ・特撮の名作',
    description = 'ガンダム、ヤマト、ガッチャマン、ハイジ、ライダー、戦隊。あの頃夢中になった作品を語り合う場。',
    display_order = 1,
    tier = 'A',
    access_level_view = 'guest',
    access_level_post = 'member',
    posting_limit_per_day = 3,
    requires_tenure_months = 0
where id = 1;

update public.categories
set slug = 'retro-music',
    name = '歌謡曲・あの頃の音楽',
    description = 'ベストテン、ピンクレディー、聖子明菜、たのきん、おニャン子。耳に焼き付いたメロディの思い出。',
    display_order = 2,
    tier = 'A',
    access_level_view = 'guest',
    access_level_post = 'member',
    posting_limit_per_day = 3,
    requires_tenure_months = 0
where id = 2;

update public.categories
set slug = 'retro-tv',
    name = 'テレビ・ドラマの記憶',
    description = 'ドリフ、ひょうきん族、太陽にほえろ、北の国から、金妻。ブラウン管の前で過ごした夜。',
    display_order = 3,
    tier = 'A',
    access_level_view = 'guest',
    access_level_post = 'member',
    posting_limit_per_day = 3,
    requires_tenure_months = 0
where id = 3;

update public.categories
set slug = 'retro-snacks',
    name = '駄菓子・給食・あの味',
    description = 'よっちゃんイカ、都こんぶ、揚げパン、ソフト麺。10円玉を握りしめて駄菓子屋へ駆け込んだ放課後。',
    display_order = 4,
    tier = 'A',
    access_level_view = 'guest',
    access_level_post = 'member',
    posting_limit_per_day = 3,
    requires_tenure_months = 0
where id = 4;

-- B 段階の 4 カテゴリ、member 閲覧 / regular 投稿
update public.categories
set slug = 'childhood-play',
    name = '子供の頃の遊び・流行り物',
    description = 'スーパーカー消しゴム、ローラースケート、ビックリマン、メンコ、缶蹴り、コックリさん。',
    display_order = 5,
    tier = 'B',
    access_level_view = 'member',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 0
where id = 5;

update public.categories
set slug = 'dead-words',
    name = '死語・流行語・あの頃の言葉',
    description = 'ナウい、ヤング、アベック、ガビーン、メンゴ。今では恥ずかしくて口にできないあの言葉。',
    display_order = 6,
    tier = 'B',
    access_level_view = 'member',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 0
where id = 6;

update public.categories
set slug = 'school-life',
    name = '学校生活・先生・部活',
    description = 'ブルマー、給食着のマスク、校内暴力、修学旅行の枕投げ。胸の奥のあの時代。',
    display_order = 7,
    tier = 'B',
    access_level_view = 'member',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 0
where id = 7;

update public.categories
set slug = 'bubble-era',
    name = 'バブル・社会人デビュー',
    description = '肩パッド、マハラジャ、ジュリアナ、トレンディドラマ、初任給で買ったもの。あの熱狂を覚えているか。',
    display_order = 8,
    tier = 'B',
    access_level_view = 'member',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 0
where id = 8;

-- C 段階の 3 カテゴリ、regular 閲覧 / regular 投稿
update public.categories
set slug = 'family-life',
    name = '家族のはなし',
    description = '夫婦、子ども、孫、親。同世代だからこそ素直に話せる、家族のいま。',
    display_order = 9,
    tier = 'C',
    access_level_view = 'regular',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 0
where id = 9;

update public.categories
set slug = 'health-life',
    name = '今の暮らし・健康のこと',
    description = '老眼、ぎっくり腰、人間ドック、更年期、健診の数字。からだと付き合っていく日々。',
    display_order = 10,
    tier = 'C',
    access_level_view = 'regular',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 0
where id = 10;

update public.categories
set slug = 'money-work-future',
    name = '仕事・お金・老後の設計',
    description = '退職、再雇用、年金、投資、家のこと。これからの人生をどう設計するか。',
    display_order = 11,
    tier = 'C',
    access_level_view = 'regular',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 0
where id = 11;

-- D 段階、変更なし（meetups のまま、説明のみ微調整）
update public.categories
set name = 'オフ会・集まり',
    description = '同い年で実際に会う集まりの告知と参加表明。入会から3ヶ月以上の正会員のみ。',
    display_order = 12,
    tier = 'D',
    access_level_view = 'regular',
    access_level_post = 'regular',
    posting_limit_per_day = null,
    requires_tenure_months = 3
where id = 12;
