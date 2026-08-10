// 学年（年度）まわりの計算。
//
// 仮想ロープレ検証で最大の構造欠陥として出たのが「早生まれ問題」だった。
// 1968年生まれ限定と名乗ると、
//   ・1969年1〜3月生まれの同級生（同じ学年）が入会できない
//   ・年表や配信の「あなたが○歳のとき」が学年とズレる
// という 2 つの形で当事者を弾いてしまう。
// 3月生まれと12月生まれのペルソナは共通して「学年計算が正しければ信頼が上がり、
// 間違っていれば永久離脱」と述べた。つまりここは信頼の踏み絵にあたるので、
// 年齢ではなく必ず学年で組み立てる。
//
// 日本の年度は 4月1日〜翌3月31日。
// 一方で「同じ学年」の境目は 4月2日〜翌4月1日（4月1日生まれは早生まれ扱い）。
// この 1 日のズレが早生まれ問題の正体なので、両者を別の関数に分けて扱う。
//
// 2026-08-10、対象を 3 学年に広げた。
// 昭和43年度（1968年度）を中心に、ひとつ上（昭和42年度）とひとつ下（昭和44年度）まで。
// 1 学年だけだと母数が薄く、立ち上げ期に「回答 0 件」が人目に触れやすい。
// 前後 1 学年なら、小学校から高校まで同じ校舎にいた相手なので、同じ話が通じる。
// ただし**中心は 1968年度のまま**で、そこを薄めない。
// 「56歳から59歳の方どうぞ」に均すと、同じ年に同じテレビを見ていたという密度が消え、
// 二択が初回参加 8.8 を取れた理由そのものが無くなる。

/** このサービスの中心となる学年、昭和43年度（1968年4月2日〜1969年4月1日生まれ）。 */
export const CORE_SCHOOL_YEAR = 1968;

/** 受け入れる学年（年度）。中心の 1968 と、その上下ひとつずつ。 */
export const ACCEPTED_SCHOOL_YEARS = [1967, 1968, 1969] as const;

/**
 * 受け入れる生年月日の範囲、昭和42年度〜昭和44年度生まれ。
 * 1967年4月2日〜1970年4月1日。境目が 4月1日 / 4月2日 なのは早生まれの扱いによる。
 */
export const ACCEPTED_BIRTH_RANGE = {
  from: { year: 1967, month: 4, day: 2 },
  to: { year: 1970, month: 4, day: 1 },
} as const;

/**
 * 生年月日から学年（年度）を返す。
 * 1967-04-02〜1968-04-01 → 1967（昭和42年度、ひとつ上の学年）
 * 1968-04-02〜1969-04-01 → 1968（昭和43年度、中心の学年）
 * 1969-04-02〜1970-04-01 → 1969（昭和44年度、ひとつ下の学年）
 *
 * DB 側の profiles.school_year 生成列と同じ式にしてある。片方だけ直さないこと。
 */
export function schoolYearOfBirth(
  year: number,
  month: number,
  day: number,
): number {
  if (month < 4 || (month === 4 && day <= 1)) return year - 1;
  return year;
}

// 日付の扱いについて。
//
// サーバ（Vercel / Node）のタイムゾーンは UTC で動く。
// getFullYear() などのローカル時刻ゲッタを使うと、日本時間の 4月1日 が
// UTC では 3月31日 と読まれ、年度の判定が丸ごと 1 年ずれる。
// 学年がズレるのはこのサービスで最も避けたい不具合なので、
// 「暦日は UTC 深夜の Date で表す」という規約に統一し、必ず getUTC* を使う。

/** 暦日（年月日）を、UTC 深夜の Date として作る。 */
export function civilDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** "YYYY-MM-DD" を暦日として読む。 */
export function parseCivilDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return civilDate(y, m, d);
}

/** 日本時間での「今日」を暦日として返す。 */
export function todayInTokyo(now: Date = new Date()): Date {
  // UTC から 9 時間進めた時点の UTC 上の年月日が、日本時間の暦日にあたる。
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return civilDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

/** 出来事の日付が属する年度を返す（4月1日〜翌3月31日）。 */
export function nendoOfDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return m >= 4 ? y : y - 1;
}

/**
 * 受け入れ範囲内の生年月日かどうか。
 *
 * DB 側の制約 profiles_birth_date_range_check がまったく同じ式で書いてある
 * （birth_year * 10000 + birth_month * 100 + birth_day を 19670402〜19700401 で挟む）。
 * 片方だけ直すと、画面の検証は通るのに保存で落ちる、という最悪の壊れ方をする。
 */
export function isAcceptedBirthday(
  year: number,
  month: number,
  day: number,
): boolean {
  if (!isValidCalendarDate(year, month, day)) return false;
  const v = year * 10000 + month * 100 + day;
  return v >= 19670402 && v <= 19700401;
}

/** 実在する暦日かどうか（2月31日などを弾く）。 */
export function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

// 小1 は学年（年度）+ 7 の年度にあたる。
// 1968年度生まれ → 1975年度に小1（1975年4月入学）。1968 + 7 = 1975。
const FIRST_GRADE_OFFSET = 7;

export type SchoolStage = {
  /** 0 = 小1 … 5 = 小6、6 = 中1 … 8 = 中3、9 = 高1 … 11 = 高3、12 以降は卒業後 */
  index: number;
  /** 「小学4年生」「中学2年生」「高校3年生」。在学期間外なら null */
  label: string | null;
};

/**
 * ある日付の時点で、その学年の人が何年生だったかを返す。
 * 在学期間の外（小学校入学前・高校卒業後）は label が null になる。
 */
export function stageAt(schoolYear: number, date: Date): SchoolStage {
  const index = nendoOfDate(date) - (schoolYear + FIRST_GRADE_OFFSET);
  if (index < 0 || index > 11) return { index, label: null };
  if (index <= 5) return { index, label: `小学${index + 1}年生` };
  if (index <= 8) return { index, label: `中学${index - 5}年生` };
  return { index, label: `高校${index - 8}年生` };
}

/** その日付の時点での満年齢。 */
export function ageAt(
  birth: { year: number; month: number; day: number },
  date: Date,
): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  let age = y - birth.year;
  const beforeBirthday =
    m < birth.month || (m === birth.month && d < birth.day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * 年表の一行に添える「あなたが〜のとき」の言い回しを作る。
 * 在学中は学年で、卒業後は年齢で言う。年齢だけで組むと早生まれが必ずズレるため、
 * 学年が使える期間は学年を優先する。
 */
export function whenPhrase(
  birth: { year: number; month: number; day: number },
  date: Date,
): string {
  const schoolYear = schoolYearOfBirth(birth.year, birth.month, birth.day);
  const stage = stageAt(schoolYear, date);
  if (stage.label) return `あなたが${stage.label}のとき`;

  const age = ageAt(birth, date);
  if (age < 6) return `あなたが${Math.max(age, 0)}歳のとき`;
  return `あなたが${age}歳のとき`;
}

/** 「昭和43年度生まれ（1968年に生まれた学年）」のような表示名。 */
export function schoolYearLabel(schoolYear: number): string {
  // 昭和元年 = 1926年。昭和 n 年 = 1925 + n。
  const showa = schoolYear - 1925;
  return `昭和${showa}年度生まれ`;
}

/** 中心の学年かどうか。昭和43年度（1968年度）だけが true。 */
export function isCoreCohort(schoolYear: number): boolean {
  return schoolYear === CORE_SCHOOL_YEAR;
}

/** 受け入れている 3 学年のどれかかどうか。 */
export function isAcceptedSchoolYear(schoolYear: number): boolean {
  return (ACCEPTED_SCHOOL_YEARS as readonly number[]).includes(schoolYear);
}

/** 中心の学年から見た位置。 */
export type CohortRelation = "above" | "core" | "below" | "outside";

export function cohortRelation(schoolYear: number): CohortRelation {
  if (schoolYear === CORE_SCHOOL_YEAR) return "core";
  if (schoolYear === CORE_SCHOOL_YEAR - 1) return "above";
  if (schoolYear === CORE_SCHOOL_YEAR + 1) return "below";
  return "outside";
}

/**
 * その学年の人に返す一行。年表と登録直後の画面で使う。
 *
 * 前後の学年に「あなたは中心ではありません」と読める書き方をしないこと。
 * 弾かれた感じが少しでも出ると、その人はもう書かない。
 * 中心との距離ではなく、「同じ校舎にいた」という共有物のほうを言う。
 */
export function cohortNote(schoolYear: number): string {
  const entered = `${schoolYear + 7}年4月に小学校へ上がり、${schoolYear + 19}年3月に高校を出た学年`;
  switch (cohortRelation(schoolYear)) {
    case "core":
      return `1968年に生まれた学年、この集まりのど真ん中です。${entered}ですね。`;
    case "above":
      return `1968年に生まれた学年の、ひとつ上ですね。${entered}です。真ん中の学年とは、小学校から高校までずっと同じ校舎にいた間柄になります。`;
    case "below":
      return `1968年に生まれた学年の、ひとつ下ですね。${entered}です。真ん中の学年とは、小学校から高校までずっと同じ校舎にいた間柄になります。`;
    default:
      return `${schoolYearLabel(schoolYear)}ですね。`;
  }
}

// 成人式と入社は、3 学年でまるきり別の景色になる。ここを一括りにすると
// 「自分の年表」ではなく「だいたいこの世代の年表」になってしまい、
// 学年で組んでいる意味が消える。年度ごとに書き分ける。
function comingOfAgeNote(schoolYear: number): string {
  switch (schoolYear) {
    case 1967: // 1988年1月、昭和63年
      return "昭和最後の成人式。この翌年に元号が変わるとは、まだ誰も思っていなかった。";
    case 1968: // 1989年1月15日、崩御の8日後
      return "昭和天皇崩御のわずか8日後。自粛の空気の中で晴れ着を着た、特別な学年。";
    case 1969: // 1990年1月
      return "平成に入って最初に迎えた成人式。街がいちばん浮かれていた頃。";
    default:
      return "振袖とスーツで、久しぶりに同級生が集まった日。";
  }
}

function joiningNote(schoolYear: number): string {
  switch (schoolYear) {
    case 1967: // 1990年4月入社
      return "売り手市場のまっただ中の入社式。会社に選ばれるより、会社を選んでいた頃。";
    case 1968: // 1991年4月入社
      return "バブル最末期の入社式。売り手市場の最後の年で、同期の人数が異常に多かった。";
    case 1969: // 1992年4月入社
      return "入った翌年から採用の数が絞られていった。あとから見れば、潮目のすぐ手前。";
    default:
      return "景気の潮目が変わる前後の入社だった。";
  }
}

/**
 * 学年ごとの節目（入学・卒業・成人式）を返す。自分年表の骨格に使う。
 * 1968年度生まれの場合、成人式が昭和天皇崩御のわずか 8 日後にあたるという、
 * この学年だけの固有の出来事が入る。
 */
export function milestonesFor(
  schoolYear: number,
): { date: string; title: string; note: string }[] {
  const y = schoolYear;
  return [
    {
      date: `${y + 7}-04-01`,
      title: "小学校に入学",
      note: "ランドセルの色が、まだ黒と赤しかなかった頃。",
    },
    {
      date: `${y + 13}-04-01`,
      title: "中学校に入学",
      note: "校則と部活と、上下関係が始まった春。",
    },
    {
      date: `${y + 16}-04-01`,
      title: "高校に入学",
      note: "定期券とアルバイトで、行動範囲が一気に広がった。",
    },
    {
      date: `${y + 19}-03-01`,
      title: "高校を卒業",
      note: "第二ボタンも、寄せ書きも、この日の話。",
    },
    {
      date: `${y + 19}-04-01`,
      title: "大学に入学、または社会人1年目が始まる",
      note: "進路が分かれ、同級生の景色が初めてバラバラになった春。",
    },
    {
      date: `${y + 21}-01-15`,
      title: "成人式",
      note: comingOfAgeNote(y),
    },
    {
      date: `${y + 23}-04-01`,
      title: "大学を卒業して入社（四年制の場合）",
      note: joiningNote(y),
    },
  ];
}
