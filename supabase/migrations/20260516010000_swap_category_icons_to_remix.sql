-- 既存 14 カテゴリのアイコンを絵文字から Remix Icon クラス名に差し替える。
-- 直前のマイグレーション（20260516000000）で絵文字を seed したが、
-- 運営フィードバックで「絵文字風はダサい、ラインアイコン化したい」となったため。
-- 表示側は components/category-icon.tsx が ri-* と絵文字の双方を扱える。

update public.categories set icon = 'ri-film-line'         where slug = 'nostalgia-anime';
update public.categories set icon = 'ri-music-2-line'      where slug = 'nostalgia-music';
update public.categories set icon = 'ri-tv-line'           where slug = 'nostalgia-tv';
update public.categories set icon = 'ri-cake-line'         where slug = 'nostalgia-snacks';
update public.categories set icon = 'ri-game-line'         where slug = 'nostalgia-play';
update public.categories set icon = 'ri-chat-3-line'       where slug = 'nostalgia-words';
update public.categories set icon = 'ri-book-open-line'    where slug = 'nostalgia-school';
update public.categories set icon = 'ri-goblet-line'       where slug = 'bubble-era';
update public.categories set icon = 'ri-leaf-line'         where slug = 'living-health';
update public.categories set icon = 'ri-home-heart-line'   where slug = 'family';
update public.categories set icon = 'ri-coin-line'         where slug = 'work-money-retirement';
update public.categories set icon = 'ri-cup-line'          where slug = 'meetups';
update public.categories set icon = 'ri-medal-line'        where slug = 'founding-lounge';
update public.categories set icon = 'ri-flower-line'       where slug = 'supporters-lounge';
