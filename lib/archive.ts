import type { PollChoice, PollRow } from "@/lib/polls";

// 過去の二択とお題の一覧。
//
// なぜ要るか。
// ホームに出るのは二択が 2 問、穴埋めが 4 問だけで、そこから外れたものは
// これまでどこからも見られなかった。在庫は二択 60 問・お題 60 問あるので、
// 週に数問ずつ出していくと、大半が一度も見られないまま流れていくことになる。
// 答え終わった人にサイト上でやることが無くなる、というのがいちばん困る。
//
// 並べ方について。
// 配信順に一列で並べると、数が増えたときに「長い一覧」になって途中でやめられる。
// 年代（小学校・中学・高校・二十代）で区切ると、自分の年表をたどる形になり、
// ひとつ答えると隣も答えたくなる。この場の趣旨にも合う。
//
// 読み出しは lib/archive-server.ts に分けてある。
// あちらは service_role の鍵を使うのでブラウザに出せない。
// このファイルは型と並べ替えだけなので、テストからもそのまま読める。

/** 年代の並び順。表示もこの順に固定する。 */
export const ERA_ORDER = ["小学校", "中学", "高校", "社会人"] as const;

/** 年代ごとの見出し。「社会人」だけは当時の呼び方に寄せる。 */
export const ERA_HEADINGS: Record<string, string> = {
  小学校: "小学校のころ",
  中学: "中学のころ",
  高校: "高校のころ",
  社会人: "二十代のころ",
};

/** 年代が入っていない問いの置き場所。最後にまとめる。 */
export const ERA_OTHER = "その他";

export type ArchivePoll = Pick<
  PollRow,
  | "id"
  | "question"
  | "option_a"
  | "option_b"
  | "option_a_image"
  | "option_b_image"
  | "icon"
  | "era"
> & {
  /** 回答した人数。0 のときは画面に出さない */
  total: number;
  /** 一言や写真が付いた数 */
  comments: number;
  /** 自分がどれに入れたか。未回答なら null */
  myChoice: PollChoice | null;
};

export type ArchiveTopic = {
  id: string;
  title: string;
  format: string;
  era: string | null;
  total: number;
  /** 自分が書いたことがあるか */
  mine: boolean;
};

/** 年代ごとにまとめた形。画面はこれをそのまま描く。 */
export type EraGroup<T> = { era: string; heading: string; items: T[] };

/** 年代ごとに分けて、決めた順に並べ替える。空の年代は落とす。 */
export function groupByEra<T extends { era: string | null }>(
  items: T[],
): EraGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key =
      item.era && ERA_ORDER.includes(item.era as (typeof ERA_ORDER)[number])
        ? item.era
        : ERA_OTHER;
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const groups: EraGroup<T>[] = [];
  for (const era of ERA_ORDER) {
    const items = buckets.get(era);
    if (items && items.length > 0) {
      groups.push({ era, heading: ERA_HEADINGS[era] ?? era, items });
    }
  }
  const rest = buckets.get(ERA_OTHER);
  if (rest && rest.length > 0) {
    groups.push({ era: ERA_OTHER, heading: "そのほか", items: rest });
  }
  return groups;
}
