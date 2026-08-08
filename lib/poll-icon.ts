import type { PollRow } from "@/lib/polls";

// 二択の設問の前に出す絵。
//
// なぜ要るか。
// 設問だけが縦に並ぶと、どれも同じ見た目になって「読む」作業になる。
// 左に小さな絵がひとつあるだけで、読む前に「野球の話だ」「テレビの話だ」と
// 分かり、目が止まる。老眼が始まっていて字を追うのが億劫な人ほど効く。
//
// なぜ写真ではなくアイコンを基本にするか。
// 79 問すべてに写真を用意することはできないし、集めるあてもない。
// 一部だけ写真になると、写真の無い問いが見劣りして押されなくなる。
// アイコンなら全部の問いに必ず付き、見た目の格が揃う。
// 写真を入れたい問いだけ、あとから写真で上書きできるようにしてある。
//
// 割り当ての決め方。
//   1. 運営が polls.icon を指定していれば、それを使う
//   2. 指定が無ければ、設問と選択肢の言葉から推測する
//   3. 推測できなければ、年代（era）ごとの既定にする
//
// 2 があるので、79 問を手で埋め直す必要がない。新しい問いを足したときも、
// 何も指定しなければそれらしいものが自動で付く。

/** 管理画面の選択肢に出す一覧。ここに無いものは選べない。 */
export const POLL_ICONS: Array<{ value: string; label: string }> = [
  { value: "ri-tv-line", label: "テレビ・番組" },
  { value: "ri-movie-2-line", label: "映画" },
  { value: "ri-music-2-line", label: "音楽・歌" },
  { value: "ri-mic-2-line", label: "アイドル・歌手" },
  { value: "ri-radio-line", label: "ラジオ" },
  { value: "ri-disc-line", label: "レコード・CD" },
  { value: "ri-headphone-line", label: "カセット・ウォークマン" },
  { value: "ri-gamepad-line", label: "ゲーム" },
  { value: "ri-computer-line", label: "パソコン" },
  { value: "ri-book-2-line", label: "まんが・本" },
  { value: "ri-newspaper-line", label: "雑誌・新聞" },
  { value: "ri-pencil-line", label: "文具・勉強" },
  { value: "ri-graduation-cap-line", label: "学校・進路" },
  { value: "ri-shirt-line", label: "制服・服装" },
  { value: "ri-scissors-line", label: "髪型" },
  { value: "ri-handbag-line", label: "カバン・持ち物" },
  { value: "ri-basketball-line", label: "スポーツ" },
  { value: "ri-trophy-line", label: "野球・勝負" },
  { value: "ri-boxing-line", label: "プロレス・格闘技" },
  { value: "ri-bike-line", label: "自転車" },
  { value: "ri-motorbike-line", label: "バイク・原付" },
  { value: "ri-car-line", label: "車" },
  { value: "ri-roadster-line", label: "スーパーカー" },
  { value: "ri-train-line", label: "電車・通学" },
  { value: "ri-plane-line", label: "旅行" },
  { value: "ri-restaurant-line", label: "食べもの・給食" },
  { value: "ri-cup-line", label: "飲みもの・お店" },
  { value: "ri-cake-3-line", label: "おやつ・お菓子" },
  { value: "ri-heart-3-line", label: "恋・好きな人" },
  { value: "ri-sparkling-line", label: "おしゃれ・かわいいもの" },
  { value: "ri-flower-line", label: "習いごと" },
  { value: "ri-gift-line", label: "おこづかい・買いもの" },
  { value: "ri-camera-line", label: "写真・思い出" },
  { value: "ri-rocket-line", label: "アニメ・ヒーロー" },
  { value: "ri-ghost-line", label: "こわい話・うわさ" },
  { value: "ri-briefcase-line", label: "仕事・社会人" },
  { value: "ri-calendar-event-line", label: "行事・できごと" },
  { value: "ri-group-line", label: "友達・集まり" },
  { value: "ri-home-heart-line", label: "家・家族" },
  { value: "ri-scales-3-line", label: "指定なし（二択の既定）" },
];

const ICON_VALUES = new Set(POLL_ICONS.map((i) => i.value));

/** 指定された値が一覧にあるか。無いものを保存させない。 */
export function isValidPollIcon(value: unknown): value is string {
  return typeof value === "string" && ICON_VALUES.has(value);
}

// 言葉から推測するための対応表。上から順に見て、最初に当たったものを使う。
// 並び順に意味がある。具体的な語ほど先に置く（「レコード」は「音楽」より先）。
const RULES: Array<{ icon: string; words: string[] }> = [
  // --- 乗りもの。車種名まで書いてあるので、ほぼ確実に当たる ---
  { icon: "ri-roadster-line", words: ["スーパーカー", "カウンタック", "フェラーリ"] },
  { icon: "ri-motorbike-line", words: ["原付", "バイク", "スクーター", "ミッション車"] },
  { icon: "ri-bike-line", words: ["自転車", "フラッシャー", "セミドロップ"] },
  { icon: "ri-car-line", words: ["車", "ソアラ", "プレリュード", "免許"] },

  // --- 勝負ごと ---
  { icon: "ri-trophy-line", words: ["野球", "甲子園", "日本シリーズ", "タイガース", "ライオンズ", "球場", "王貞治", "掛布", "原辰徳", "江川", "三塁手", "PL学園", "池田高校"] },
  { icon: "ri-boxing-line", words: ["プロレス", "相撲", "タイガーマスク", "猪木", "千代の富士", "北の湖"] },

  // --- 機械もの ---
  { icon: "ri-gamepad-line", words: ["ファミコン", "ゲーム", "インベーダー", "ドラゴンクエスト", "ドラクエ", "ルービックキューブ"] },
  { icon: "ri-computer-line", words: ["パソコン", "PC-", "MSX", "ワープロ"] },

  // --- 身のまわり。ここは順番が効く ---
  // 「中学の頃の髪型は？／聖子ちゃんカット」を、アイドルではなく髪型に寄せる
  { icon: "ri-scissors-line", words: ["髪型", "丸刈り", "カット", "前髪"] },
  // 「筆箱やハンカチ／ハローキティ」を、カバンではなくかわいいものに寄せる
  { icon: "ri-sparkling-line", words: ["サンリオ", "キティ", "キキ", "ファンシー", "おしゃれ", "化粧", "かわいい"] },
  // 「高校のカバンは？／ナイロンのスポーツバッグ」を、スポーツではなくカバンに寄せる
  { icon: "ri-handbag-line", words: ["カバン", "かばん", "バッグ", "筆箱", "下敷き"] },
  // 「中学の技術の時間／ラジオなどの電気工作」を、ラジオ番組ではなく工作に寄せる
  { icon: "ri-pencil-line", words: ["技術", "工作", "文具", "消しゴム", "レターセット", "ノート", "シール"] },

  // --- 読みもの・見るもの ---
  // 「名作劇場」を映画と取り違えないよう、ここは「劇場版」に限る
  { icon: "ri-movie-2-line", words: ["映画", "劇場版", "ロードショー"] },
  { icon: "ri-rocket-line", words: ["ヤマト", "ガンダム", "ガンプラ", "ヒーロー", "ゴレンジャー", "ライダー", "アニメ", "ラジコン", "999", "ルパン", "名作劇場", "フランダース", "赤毛のアン"] },
  { icon: "ri-book-2-line", words: ["まんが", "マンガ", "漫画", "ジャンプ", "マガジン", "キン肉マン", "キャプテン翼", "北斗の拳", "シティーハンター", "ベルサイユ", "ガラスの仮面", "キャンディ", "ときめき", "生徒諸君"] },
  { icon: "ri-newspaper-line", words: ["雑誌", "明星", "平凡", "JJ", "Olive", "セブンティーン", "科学", "学習", "新聞"] },

  // --- 音まわり。機械 → 媒体 → 人 → 曲、の順に広げる ---
  { icon: "ri-radio-line", words: ["ラジオ", "オールナイトニッポン", "深夜"] },
  { icon: "ri-headphone-line", words: ["カセット", "TDK", "マクセル", "エアチェック", "ダビング", "ウォークマン", "ラジカセ"] },
  { icon: "ri-disc-line", words: ["レコード", "CD", "貸レコード"] },
  { icon: "ri-mic-2-line", words: ["聖子", "明菜", "百恵", "ピンク・レディー", "たのきん", "チェッカーズ", "吉川", "おニャン子", "光GENJI", "少年隊", "アイドル", "小泉今日子", "堀ちえみ", "河合奈保子", "柏原芳恵", "キャンディーズ"] },
  { icon: "ri-music-2-line", words: ["音楽", "歌", "尾崎", "佐野", "BOØWY", "レベッカ", "バンド", "洋楽", "邦楽", "ユーミン", "松任谷", "中島みゆき", "マイケル", "マドンナ", "カラオケ", "ベストテン", "ヒットスタジオ"] },
  { icon: "ri-tv-line", words: ["テレビ", "全員集合", "ひょうきん", "ドラマ", "スチュワーデス", "積み木くずし", "スクール☆ウォーズ", "スケバン刑事", "不良少女", "東京ラブストーリー", "おしん", "番組"] },

  // --- 学校まわり ---
  { icon: "ri-shirt-line", words: ["制服", "学生服", "セーラー", "ブレザー", "短ラン", "長ラン", "服装", "ボディコン", "着ていた"] },
  { icon: "ri-graduation-cap-line", words: ["学校", "共通一次", "進路", "進学", "就職", "受験", "卒業", "成人式", "修学旅行"] },

  // --- 食べる・飲む ---
  { icon: "ri-restaurant-line", words: ["給食", "弁当", "料理", "食べ"] },
  { icon: "ri-cake-3-line", words: ["おやつ", "お菓子", "チョコ", "アイス"] },
  { icon: "ri-cup-line", words: ["喫茶", "居酒屋", "ディスコ", "スナック", "飲"] },

  // --- 気持ち・暮らし ---
  { icon: "ri-heart-3-line", words: ["好き", "恋", "心を寄せ", "夢中", "文通", "交換日記", "クリスマス"] },
  { icon: "ri-flower-line", words: ["習いごと", "習い事", "英会話", "お茶", "お花", "ピアノ"] },
  { icon: "ri-ghost-line", words: ["口裂け女", "こわ", "怖", "うわさ", "噂"] },
  { icon: "ri-plane-line", words: ["旅行", "海外", "万博"] },
  { icon: "ri-train-line", words: ["通学", "電車", "国鉄", "新幹線"] },
  { icon: "ri-basketball-line", words: ["部活", "スポーツ", "スキー", "ゴルフ", "テニス", "運動"] },
  { icon: "ri-gift-line", words: ["小遣い", "こづかい", "お年玉", "買っ", "買い"] },
  { icon: "ri-home-heart-line", words: ["実家", "家族", "母", "父"] },
  // 「二十代」は最後。ここまで来たものだけを仕事の絵にする。
  // 先に置くと「二十代の習い事」「二十代の夜」まで全部これになってしまう
  { icon: "ri-briefcase-line", words: ["仕事", "会社", "職場", "初任給", "二十代"] },
];

/** 年代ごとの逃げ先。ここまで来たら、せめて時期が伝わるものにする。 */
const ERA_FALLBACK: Record<string, string> = {
  小学校: "ri-pencil-line",
  中学: "ri-graduation-cap-line",
  高校: "ri-graduation-cap-line",
  社会人: "ri-briefcase-line",
};

const DEFAULT_ICON = "ri-scales-3-line";

type IconSource = Pick<
  PollRow,
  "question" | "option_a" | "option_b" | "era"
> & { icon?: string | null };

/**
 * この二択に出す絵を決める。
 * 運営の指定があればそれを使い、無ければ言葉から推測する。
 */
export function pollIcon(poll: IconSource): string {
  if (isValidPollIcon(poll.icon)) return poll.icon;

  const haystack = `${poll.question} ${poll.option_a} ${poll.option_b}`;
  for (const rule of RULES) {
    if (rule.words.some((w) => haystack.includes(w))) return rule.icon;
  }

  if (poll.era && ERA_FALLBACK[poll.era]) return ERA_FALLBACK[poll.era];
  return DEFAULT_ICON;
}
