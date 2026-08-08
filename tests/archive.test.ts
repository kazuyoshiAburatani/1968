import { describe, expect, it } from "vitest";
import { ERA_HEADINGS, ERA_ORDER, groupByEra } from "@/lib/archive";

// 一覧の並べ方。
//
// 年代で区切るのは、配信順の一列にすると数が増えたときに「長い一覧」になって
// 途中でやめられるため。小学校から順にたどる形にすると、自分の年表をなぞる
// 感覚になる。したがって「必ずこの順で出る」ことと「年代が入っていないものが
// 消えない」ことの 2 つが要件になる。

const item = (era: string | null, id: string) => ({ era, id });

describe("groupByEra", () => {
  it("小学校・中学・高校・二十代の順に並べる。入力順には従わない", () => {
    const groups = groupByEra([
      item("社会人", "d"),
      item("中学", "b"),
      item("小学校", "a"),
      item("高校", "c"),
    ]);
    expect(groups.map((g) => g.era)).toEqual([
      "小学校",
      "中学",
      "高校",
      "社会人",
    ]);
  });

  it("見出しは当時の呼び方にする", () => {
    const groups = groupByEra([item("社会人", "a")]);
    expect(groups[0].heading).toBe("二十代のころ");
    expect(ERA_HEADINGS["小学校"]).toBe("小学校のころ");
  });

  it("その年代に何も無ければ、見出しごと出さない", () => {
    // 空の「中学のころ」だけが並ぶと、途切れている場に見える
    const groups = groupByEra([item("小学校", "a"), item("高校", "b")]);
    expect(groups.map((g) => g.era)).toEqual(["小学校", "高校"]);
  });

  it("年代が入っていないものは、最後にまとめて必ず出す", () => {
    // ここで落とすと、運営が年代を付け忘れた問いが一覧から消え、
    // 「作ったのに出てこない」という分かりにくい事故になる
    const groups = groupByEra([item(null, "x"), item("小学校", "a")]);
    expect(groups.map((g) => g.era)).toEqual(["小学校", "その他"]);
    expect(groups[1].heading).toBe("そのほか");
    expect(groups[1].items).toHaveLength(1);
  });

  it("知らない年代が入っていても、落とさずに「そのほか」へ回す", () => {
    const groups = groupByEra([item("大学", "x")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].era).toBe("その他");
  });

  it("年代の中では、渡された順序をそのまま保つ", () => {
    // 呼び出し側が新しい順に並べて渡すので、ここで並べ替えてはいけない
    const groups = groupByEra([
      item("小学校", "a"),
      item("小学校", "b"),
      item("小学校", "c"),
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("何も無ければ空を返す", () => {
    expect(groupByEra([])).toEqual([]);
  });

  it("入れたものが 1 件も欠けない", () => {
    const input = [
      item("小学校", "a"),
      item(null, "b"),
      item("社会人", "c"),
      item("中学", "d"),
      item("知らない年代", "e"),
    ];
    const out = groupByEra(input).flatMap((g) => g.items);
    expect(out).toHaveLength(input.length);
    expect(new Set(out.map((i) => i.id))).toEqual(
      new Set(input.map((i) => i.id)),
    );
  });
});

describe("ERA_ORDER", () => {
  it("管理画面の年代の選択肢と同じ並びにしてある", () => {
    // lib/validation/topic.ts の TOPIC_ERA_VALUES と揃っていないと、
    // 管理画面で選べるのに一覧では「そのほか」に落ちる年代が生まれる
    expect([...ERA_ORDER]).toEqual(["小学校", "中学", "高校", "社会人"]);
  });

  it("すべての年代に見出しが用意されている", () => {
    for (const era of ERA_ORDER) {
      expect(ERA_HEADINGS[era]).toBeTruthy();
    }
  });
});
