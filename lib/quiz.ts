// 「昭和43年度生まれ検定」の出題ロジック。
//
// 検証で見えた 2 つの制約をそのまま実装に落としてある。
//
// 1. 6 問まで。10 問はスキマ時間しかない層（夜勤明けの看護師ペルソナ）には長すぎ、
//    3 問目で離脱した。5 分で終わる長さが上限。
// 2. 男女ネタを必ず半々にする。BOXY・スーパーカー消しゴム・プロレスに偏ると、
//    8 点だった女性ペルソナが「私は本物じゃない側」に置かれて静かに傷つき、
//    人に勧めなくなる、という副作用が出た。3 問ずつで固定する。

export const QUESTIONS_PER_SET = 6;
const MALE_PER_SET = 3;
const FEMALE_PER_SET = 3;

export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
  era: string | null;
  gender_lean: "male" | "female" | "both";
};

/**
 * 決定的な擬似乱数。同じ seed なら必ず同じ並びになる。
 * 結果ページの URL を人に見せたとき、相手が同じ問題を解けるようにするため、
 * Math.random は使わない。
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 文字列 seed を数値に潰す。 */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 男女半々の 1 セットを組む。
 * 該当性別の在庫が足りないときは both で埋め、それでも足りなければ残り全部から補う。
 * 出題順は男女が交互になるよう並べ、途中離脱しても偏らないようにする。
 */
export function buildQuizSet(
  all: QuizQuestion[],
  seed: number,
): QuizQuestion[] {
  const rand = mulberry32(seed);
  const male = shuffle(all.filter((q) => q.gender_lean === "male"), rand);
  const female = shuffle(all.filter((q) => q.gender_lean === "female"), rand);
  const both = shuffle(all.filter((q) => q.gender_lean === "both"), rand);

  const pickedMale = male.slice(0, MALE_PER_SET);
  const pickedFemale = female.slice(0, FEMALE_PER_SET);

  // 在庫不足を both で補う
  const bothPool = [...both];
  while (pickedMale.length < MALE_PER_SET && bothPool.length > 0) {
    pickedMale.push(bothPool.shift()!);
  }
  while (pickedFemale.length < FEMALE_PER_SET && bothPool.length > 0) {
    pickedFemale.push(bothPool.shift()!);
  }

  // 男女交互に並べる
  const ordered: QuizQuestion[] = [];
  const maxLen = Math.max(pickedMale.length, pickedFemale.length);
  // 先頭がいつも男性ネタだと女性が最初の 1 問で冷めるので、seed で先攻を入れ替える
  const femaleFirst = seed % 2 === 0;
  for (let i = 0; i < maxLen; i++) {
    const a = femaleFirst ? pickedFemale[i] : pickedMale[i];
    const b = femaleFirst ? pickedMale[i] : pickedFemale[i];
    if (a) ordered.push(a);
    if (b) ordered.push(b);
  }

  // それでも足りなければ残りから補充
  if (ordered.length < QUESTIONS_PER_SET) {
    const used = new Set(ordered.map((q) => q.id));
    for (const q of shuffle(all, rand)) {
      if (ordered.length >= QUESTIONS_PER_SET) break;
      if (!used.has(q.id)) {
        ordered.push(q);
        used.add(q.id);
      }
    }
  }

  return ordered.slice(0, QUESTIONS_PER_SET);
}

/**
 * 新しいセットの合言葉を作る。
 * 結果ページの URL を人に見せたときに同じ問題が出るよう、
 * この合言葉から出題を決める（seed になる）。
 */
export function newSetKey(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** 点数に応じた称号。0 点でも突き放さない言い方にする。 */
export function verdictFor(score: number, total: number): {
  title: string;
  body: string;
} {
  const ratio = total > 0 ? score / total : 0;
  if (ratio === 1) {
    return {
      title: "文句なしの、昭和43年度生まれ級",
      body: "全問正解です。当時をまるごと体で覚えている人にしか、この点は出ません。",
    };
  }
  if (ratio >= 0.66) {
    return {
      title: "まぎれもなく、あの学年",
      body: "取りこぼした問題は、たぶん男女で流行りが分かれていたほうの話です。",
    };
  }
  if (ratio >= 0.34) {
    return {
      title: "同じ時代を、少し違う場所で",
      body: "地域や家庭で、流行りものの届き方はずいぶん違いました。あなたの側の話も聞かせてください。",
    };
  }
  return {
    title: "あなたの記憶は、ここには無いほうの記憶",
    body: "同じ学年でも、覚えていることはこれだけ違います。あなたが覚えているほうを、ぜひ書いていってください。",
  };
}
