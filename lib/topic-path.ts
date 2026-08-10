// お題まわりの URL を 1 か所にまとめる。
//
// 書き込みを独立したページに分けたので、
// 「書く」への行き先を各所で組み立てると必ずどこかがずれる。
// ポップアップにしなかったのは、スマホのキーボードと相性が悪く、
// 枠の外を触っただけで書きかけの文章が消える危険があるため。
// 本物のページなら、戻るボタンが素直に効き、打った文章も消えない。

/** お題の詳細ページ。 */
export function topicPath(topicId: string): string {
  return `/topics/${topicId}`;
}

/** お題への書き込みページ。入力欄だけが載っている。 */
export function writePath(topicId: string): string {
  return `/topics/${topicId}/kaku`;
}
