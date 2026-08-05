import { describe, expect, it } from "vitest";
import {
  schoolYearOfBirth,
  nendoOfDate,
  isAcceptedBirthday,
  stageAt,
  ageAt,
  whenPhrase,
  schoolYearLabel,
  isCoreCohort,
  milestonesFor,
  civilDate,
  parseCivilDate,
  todayInTokyo,
  CORE_SCHOOL_YEAR,
} from "@/lib/school-year";

// 学年計算はこのサービスの信頼の踏み絵にあたる。
// 早生まれの人はここが合っているかを最初に確かめ、ズレていれば二度と来ない。
// したがって境界（4月1日と4月2日）は特に厚くテストする。

describe("schoolYearOfBirth", () => {
  it("4月2日生まれからが、その年の学年になる", () => {
    expect(schoolYearOfBirth(1968, 4, 2)).toBe(1968);
    expect(schoolYearOfBirth(1968, 12, 31)).toBe(1968);
    expect(schoolYearOfBirth(1969, 1, 1)).toBe(1968);
    expect(schoolYearOfBirth(1969, 4, 1)).toBe(1968);
  });

  it("4月1日生まれは早生まれ扱いで、ひとつ上の学年になる", () => {
    expect(schoolYearOfBirth(1968, 4, 1)).toBe(1967);
    expect(schoolYearOfBirth(1969, 4, 2)).toBe(1969);
  });

  it("1968年1〜3月生まれは昭和42年度、ひとつ上の学年", () => {
    expect(schoolYearOfBirth(1968, 1, 1)).toBe(1967);
    expect(schoolYearOfBirth(1968, 3, 31)).toBe(1967);
  });
});

describe("isAcceptedBirthday", () => {
  it("1968年1月1日から1969年4月1日までを受け入れる", () => {
    expect(isAcceptedBirthday(1968, 1, 1)).toBe(true);
    expect(isAcceptedBirthday(1968, 7, 15)).toBe(true);
    expect(isAcceptedBirthday(1969, 3, 31)).toBe(true);
    expect(isAcceptedBirthday(1969, 4, 1)).toBe(true);
  });

  it("範囲外は弾く", () => {
    expect(isAcceptedBirthday(1967, 12, 31)).toBe(false);
    expect(isAcceptedBirthday(1969, 4, 2)).toBe(false);
    expect(isAcceptedBirthday(1970, 1, 1)).toBe(false);
  });

  it("存在しない日付は弾く", () => {
    expect(isAcceptedBirthday(1968, 2, 31)).toBe(false);
    expect(isAcceptedBirthday(1968, 13, 1)).toBe(false);
  });

  it("1968年は閏年なので2月29日は実在する", () => {
    expect(isAcceptedBirthday(1968, 2, 29)).toBe(true);
  });
});

describe("nendoOfDate", () => {
  it("4月から翌3月までが同じ年度", () => {
    expect(nendoOfDate(civilDate(1982, 4, 1))).toBe(1982);
    expect(nendoOfDate(civilDate(1983, 3, 31))).toBe(1982);
    expect(nendoOfDate(civilDate(1983, 4, 1))).toBe(1983);
  });
});

describe("stageAt", () => {
  // 昭和43年度生まれ、1975年4月に小1、1987年3月に高校卒業
  const sy = CORE_SCHOOL_YEAR;

  it("小学校の6年間を正しく返す", () => {
    expect(stageAt(sy, civilDate(1975, 4, 10)).label).toBe(
      "小学1年生",
    );
    expect(stageAt(sy, civilDate(1980, 9, 1)).label).toBe(
      "小学6年生",
    );
  });

  it("中学、明菜のデビュー（1982年5月）は中学2年生", () => {
    expect(stageAt(sy, civilDate(1982, 5, 1)).label).toBe(
      "中学2年生",
    );
  });

  it("高校、夕やけニャンニャン開始（1985年4月）は高校2年生", () => {
    expect(stageAt(sy, civilDate(1985, 4, 1)).label).toBe(
      "高校2年生",
    );
  });

  it("ファミコン発売（1983年7月）は中学3年生", () => {
    expect(stageAt(sy, civilDate(1983, 7, 15)).label).toBe(
      "中学3年生",
    );
  });

  it("在学期間の外は label が null", () => {
    expect(stageAt(sy, civilDate(1974, 4, 1)).label).toBeNull();
    expect(stageAt(sy, civilDate(1989, 1, 7)).label).toBeNull();
  });

  it("早生まれ（1969年3月生まれ）も同じ学年として扱われる", () => {
    const early = schoolYearOfBirth(1969, 3, 10);
    expect(early).toBe(CORE_SCHOOL_YEAR);
    expect(stageAt(early, civilDate(1982, 5, 1)).label).toBe(
      "中学2年生",
    );
  });

  it("1968年1月生まれはひとつ上の学年なので、同じ日付で1学年ずれる", () => {
    const older = schoolYearOfBirth(1968, 1, 20);
    expect(older).toBe(1967);
    expect(stageAt(older, civilDate(1982, 5, 1)).label).toBe(
      "中学3年生",
    );
  });
});

describe("ageAt", () => {
  it("誕生日前は1歳若い", () => {
    const birth = { year: 1968, month: 12, day: 25 };
    expect(ageAt(birth, civilDate(1989, 1, 7))).toBe(20);
    expect(ageAt(birth, civilDate(1988, 12, 24))).toBe(19);
    expect(ageAt(birth, civilDate(1988, 12, 25))).toBe(20);
  });
});

describe("whenPhrase", () => {
  it("在学中は学年で言う（年齢では言わない）", () => {
    const birth = { year: 1968, month: 12, day: 1 };
    expect(whenPhrase(birth, civilDate(1982, 5, 1))).toBe(
      "あなたが中学2年生のとき",
    );
  });

  it("卒業後は年齢で言う", () => {
    const birth = { year: 1968, month: 12, day: 1 };
    expect(whenPhrase(birth, civilDate(1989, 1, 7))).toBe(
      "あなたが20歳のとき",
    );
  });

  it("12月生まれと3月生まれで、在学中の言い回しが一致する", () => {
    const dec = { year: 1968, month: 12, day: 1 };
    const mar = { year: 1969, month: 3, day: 1 };
    const d = civilDate(1985, 4, 5);
    expect(whenPhrase(dec, d)).toBe(whenPhrase(mar, d));
  });
});

describe("schoolYearLabel / isCoreCohort", () => {
  it("1968年度は昭和43年度", () => {
    expect(schoolYearLabel(1968)).toBe("昭和43年度生まれ");
    expect(schoolYearLabel(1967)).toBe("昭和42年度生まれ");
  });

  it("中核の学年は1968年度だけ", () => {
    expect(isCoreCohort(1968)).toBe(true);
    expect(isCoreCohort(1967)).toBe(false);
  });
});

describe("milestonesFor", () => {
  it("昭和43年度生まれの節目が、実際の年と一致する", () => {
    const ms = milestonesFor(CORE_SCHOOL_YEAR);
    const byTitle = (t: string) => ms.find((m) => m.title.startsWith(t));

    expect(byTitle("小学校に入学")?.date).toBe("1975-04-01");
    expect(byTitle("中学校に入学")?.date).toBe("1981-04-01");
    expect(byTitle("高校に入学")?.date).toBe("1984-04-01");
    expect(byTitle("高校を卒業")?.date).toBe("1987-03-01");
    expect(byTitle("成人式")?.date).toBe("1989-01-15");
    expect(byTitle("大学を卒業")?.date).toBe("1991-04-01");
  });

  it("この学年の成人式には、昭和天皇崩御の直後だったという注記が付く", () => {
    const ms = milestonesFor(CORE_SCHOOL_YEAR);
    const seijin = ms.find((m) => m.title === "成人式");
    expect(seijin?.note).toContain("8日後");
  });

  it("ひとつ上の学年には、その注記は付かない", () => {
    const ms = milestonesFor(1967);
    const seijin = ms.find((m) => m.title === "成人式");
    expect(seijin?.note).not.toContain("8日後");
  });
});

describe("暦日ヘルパー（UTC 実行環境での日付ズレ対策）", () => {
  it("parseCivilDate は YYYY-MM-DD をそのままの年月日として読む", () => {
    const d = parseCivilDate("1985-04-01");
    expect(d.getUTCFullYear()).toBe(1985);
    expect(d.getUTCMonth() + 1).toBe(4);
    expect(d.getUTCDate()).toBe(1);
  });

  it("4月1日の出来事が、前年度に吸い込まれない", () => {
    // ローカル時刻ゲッタを使っていた頃、UTC 実行環境では 3月31日 と読まれ、
    // 年度が丸ごと 1 年ずれていた。
    expect(nendoOfDate(parseCivilDate("1985-04-01"))).toBe(1985);
    expect(nendoOfDate(parseCivilDate("1985-03-31"))).toBe(1984);
  });

  it("todayInTokyo は日本時間の暦日を返す", () => {
    // UTC 2026-08-04 22:00 は、日本時間では 8月5日
    const d = todayInTokyo(new Date("2026-08-04T22:00:00Z"));
    expect(d.getUTCMonth() + 1).toBe(8);
    expect(d.getUTCDate()).toBe(5);
  });

  it("小学校入学（4月1日）が小学1年生として出る", () => {
    expect(stageAt(CORE_SCHOOL_YEAR, parseCivilDate("1975-04-01")).label).toBe(
      "小学1年生",
    );
  });
});
