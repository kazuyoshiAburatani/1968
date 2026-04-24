-- 段階A（ゲスト閲覧可・準会員投稿可）全カテゴリの
-- 1日スレッド作成上限を3件に統一する。
-- 返信は posting_limit の対象外、無制限のままとする。

update public.categories
set posting_limit_per_day = 3
where tier = 'A';
