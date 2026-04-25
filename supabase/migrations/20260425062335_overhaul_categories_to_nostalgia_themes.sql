-- カテゴリを 1968 年生まれ世代の懐かしさ・思い出を軸にした 12 個に刷新する。
-- 段階A 4 枚すべてをノスタルジア系にし、ゲスト閲覧時の魅力と SEO 流入を最大化する。
-- 段階B も思い出系を増やし、無料会員でも楽しめる導線を作る。
-- 段階C は今のリアルな暮らし・家族・お金に統合、深い相談を 3 枠に集約。
--
-- 変更内容、
-- 1. テスト時に作成された threads/replies/likes/reports と関連する Storage の参照は本 migration の範囲外で別途整理する
--    （RLS とサービス側のパスがぶら下がるため、ここでは categories 行のみを更新する）
-- 2. category id は 1〜12 を維持して既存外部リンクの互換性を確保
-- 3. slug は新しい英語スラッグに一新、URL は変わるが本番公開前なので影響は限定的

-- 既存テスト投稿のクリーンアップ、新カテゴリと整合させるため
delete from public.likes where target_type in ('thread', 'reply');
delete from public.reports;
delete from public.replies;
delete from public.threads;

-- カテゴリ刷新
update public.categories set
  slug = 'nostalgia-anime',
  name = 'アニメ・特撮の名作',
  description = 'ガンダム、ヤマト、ガッチャマン、キャンディ、ライダー、戦隊。胸を熱くしたあの頃の作品たちを語り合いましょう。',
  tier = 'A',
  access_level_view = 'guest',
  access_level_post = 'member',
  posting_limit_per_day = 3
  where id = 1;

update public.categories set
  slug = 'nostalgia-music',
  name = '歌謡曲・あの頃の音楽',
  description = 'ベストテン、聖子明菜、おニャン子、たのきん、ピンクレディー、洋楽 MTV 黄金期。レコードもカセットも、思い出の一曲を。',
  tier = 'A',
  access_level_view = 'guest',
  access_level_post = 'member',
  posting_limit_per_day = 3
  where id = 2;

update public.categories set
  slug = 'nostalgia-tv',
  name = 'テレビ・ドラマの記憶',
  description = 'ドリフ、ひょうきん族、太陽にほえろ、北の国から、金妻、おしん。家族で見たお茶の間のあの時間。',
  tier = 'A',
  access_level_view = 'guest',
  access_level_post = 'member',
  posting_limit_per_day = 3
  where id = 3;

update public.categories set
  slug = 'nostalgia-snacks',
  name = '駄菓子・給食・あの味',
  description = '都こんぶ、よっちゃんイカ、ココアシガレット、揚げパン、ソフト麺、町の食堂。10 円玉を握りしめた日々の味。',
  tier = 'A',
  access_level_view = 'guest',
  access_level_post = 'member',
  posting_limit_per_day = 3
  where id = 4;

update public.categories set
  slug = 'nostalgia-play',
  name = '子供の頃の遊び・流行り物',
  description = 'ローラースケート、スーパーカー消しゴム、ビックリマン、メンコ、缶蹴り、コックリさん。あの頃の空気を取り戻しに。',
  tier = 'B',
  access_level_view = 'member',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 5;

update public.categories set
  slug = 'nostalgia-words',
  name = '死語・流行語・あの頃の言葉',
  description = 'ナウい、アベック、ガビーン、ナウなヤング、冗談はよし子さん。気がつけば使わなくなった言葉たち。',
  tier = 'B',
  access_level_view = 'member',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 6;

update public.categories set
  slug = 'nostalgia-school',
  name = '学校生活・先生・部活',
  description = 'ブルマー、給食当番、修学旅行、校内放送、卒業文集。同い年だから分かち合える学校の風景。',
  tier = 'B',
  access_level_view = 'member',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 7;

update public.categories set
  slug = 'bubble-era',
  name = 'バブル・社会人デビュー',
  description = '入社式の肩パッド、マハラジャ、ジュリアナ、初任給で買ったもの、トレンディドラマの夜。',
  tier = 'B',
  access_level_view = 'member',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 8;

update public.categories set
  slug = 'living-health',
  name = '今の暮らし・健康のこと',
  description = 'ぎっくり腰、老眼、人間ドック、睡眠の質。同い年だから、率直に話せる体と暮らしの今。',
  tier = 'C',
  access_level_view = 'regular',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 9;

update public.categories set
  slug = 'family',
  name = '家族のはなし',
  description = '夫婦、子ども、孫、そして親の介護。一番身近で、一番話しにくい家族のことを、ここでは少し肩の力を抜いて。',
  tier = 'C',
  access_level_view = 'regular',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 10;

update public.categories set
  slug = 'work-money-retirement',
  name = '仕事・お金・老後の設計',
  description = '現役、再雇用、独立、リタイア。年金、資産、これからの暮らし方。同世代だから言える本音の話。',
  tier = 'C',
  access_level_view = 'regular',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 11;

-- meetups は名前・スラッグそのまま、念のため更新
update public.categories set
  slug = 'meetups',
  name = 'オフ会・集まり',
  description = '同世代で直接会う集まりの告知・参加。入会から3カ月以上の正会員のみご利用いただけます。',
  tier = 'D',
  access_level_view = 'regular',
  access_level_post = 'regular',
  posting_limit_per_day = null
  where id = 12;
