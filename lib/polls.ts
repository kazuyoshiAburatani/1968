// 二択投票の型と、画面・サーバの両方から使う小さな関数。
//
// 読み出し（loadPolls）は lib/polls-server.ts に分けてある。
// あちらは service_role の鍵を使うのでブラウザに出せない。
// このファイルはクライアントコンポーネント（PollCard）からも読むので、
// サーバ専用のものを持ち込まないこと。

/** 'other' は「どちらも選べない」人の受け皿。 */
export type PollChoice = "a" | "b" | "other";

export type PollRow = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  /** 選択肢の写真。poll-media バケット内のパス。両方 null か、両方入っているかのどちらか */
  option_a_image: string | null;
  option_b_image: string | null;
  /** 設問の前に出すアイコン。null なら lib/poll-icon.ts が言葉から推測する */
  icon: string | null;
  /** 設問の上に出す写真。入っているときはアイコンより優先する */
  header_image: string | null;
  blurb: string;
  era: string | null;
  gender_lean: "male" | "female" | "both";
  published_at: string;
};

export type PollComment = {
  choice: PollChoice;
  comment: string;
  /** 添えられた写真。post-media バケット内のパス */
  image_path: string | null;
  created_at: string;
};

export type PollWithResult = PollRow & {
  countA: number;
  countB: number;
  countOther: number;
  total: number;
  /** 自分がどれに入れたか。未投票なら null */
  myChoice: PollChoice | null;
  /** 投票に添えられた一言、新しい順 */
  comments: PollComment[];
};

/** 選択肢に写真が入っているか。片方だけということは無い（DB 制約で担保）。 */
export function hasOptionImages(
  poll: Pick<PollRow, "option_a_image" | "option_b_image">,
): boolean {
  return poll.option_a_image !== null && poll.option_b_image !== null;
}

// 何人から「割合」で見せるか。
//
// 立ち上げ期は、答えた人が数人しかいない。そこに「67%」と出すと、
// 統計に見えるのに中身が3人しかないので、かえって場の小ささが際立つ。
// 「1人しかいない」ときの「100%」は、ほとんど故障に見える。
//
// 少ないうちは実数で「3人中2人」と出す。こちらのほうが、
// 同じ事実でも人の顔が見える言い方になる。
// 10人を超えたら割合に切り替える。そこからは割合のほうが速く読める。
export const PERCENT_THRESHOLD = 10;

/** 割合で見せてよい人数が集まっているか。 */
export function showAsPercent(total: number): boolean {
  return total >= PERCENT_THRESHOLD;
}

/** 得票率（%）。総数 0 のときは 0 を返す。 */
export function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/** 選択肢の表示名。 */
export function choiceLabel(poll: PollRow, choice: PollChoice): string {
  if (choice === "a") return poll.option_a;
  if (choice === "b") return poll.option_b;
  return "その他";
}
