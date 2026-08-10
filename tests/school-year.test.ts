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
  ACCEPTED_SCHOOL_YEARS,
  cohortRelation,
  cohortNote,
  isAcceptedSchoolYear,
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
  // 2026-08-10、対象を3学年（昭和42・43・44年度）に広げた。
  // 受け入れ範囲は 1967-04-02 〜 1970-04-01。
  // DB 側の profiles_birth_date_range_check がまったく同じ境目で書いてある。
  it("3学年ぶんの、境目のちょうど内側を受け入れる", () => {
    expect(isAcceptedBirthday(1967, 4, 2)).toBe(true); // 昭和42年度のはじまり
    expect(isAcceptedBirthday(1968, 4, 1)).toBe(true); // 昭和42年度の早生まれ
    expect(isAcceptedBirthday(1968, 4, 2)).toBe(true); // 昭和43年度のはじまり
    expect(isAcceptedBirthday(1969, 4, 1)).toBe(true); // 昭和43年度の早生まれ
    expect(isAcceptedBirthday(1969, 4, 2)).toBe(true); // 昭和44年度のはじまり
    expect(isAcceptedBirthday(1970, 4, 1)).toBe(true); // 昭和44年度の早生まれ、範囲の最後
  });

  it("これまで対象だった1968年生まれは、全員そのまま入れる", () => {
    expect(isAcceptedBirthday(1968, 1, 1)).toBe(true);
    expect(isAcceptedBirthday(1968, 7, 15)).toBe(true);
    expect(isAcceptedBirthday(1968, 12, 31)).toBe(true);
    expect(isAcceptedBirthday(1969, 3, 31)).toBe(true);
  });

  it("境目のちょうど外側は弾く", () => {
    expect(isAcceptedBirthday(1967, 4, 1)).toBe(false); // 1日手前
    expect(isAcceptedBirthday(1970, 4, 2)).toBe(false); // 1日あと
    expect(isAcceptedBirthday(1966, 12, 31)).toBe(false);
    expect(isAcceptedBirthday(1971, 1, 1)).toBe(false);
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

  it("中心の学年は1968年度だけ", () => {
    expect(isCoreCohort(1968)).toBe(true);
    expect(isCoreCohort(1967)).toBe(false);
    expect(isCoreCohort(1969)).toBe(false);
  });
});

describe("受け入れる3学年", () => {
  it("昭和42・43・44年度の3つ", () => {
    expect([...ACCEPTED_SCHOOL_YEARS]).toEqual([1967, 1968, 1969]);
    expect(ACCEPTED_SCHOOL_YEARS.map(schoolYearLabel)).toEqual([
      "昭和42年度生まれ",
      "昭和43年度生まれ",
      "昭和44年度生まれ",
    ]);
  });

  it("isAcceptedSchoolYear が3学年だけを通す", () => {
    expect(isAcceptedSchoolYear(1966)).toBe(false);
    expect(isAcceptedSchoolYear(1967)).toBe(true);
    expect(isAcceptedSchoolYear(1969)).toBe(true);
    expect(isAcceptedSchoolYear(1970)).toBe(false);
  });

  it("受け入れる生年月日は、必ず3学年のどれかになる", () => {
    // 範囲の全日を走査して、学年計算と受け入れ範囲がずれていないことを確かめる。
    // ここがずれると、画面は通るのに DB の制約で落ちる。
    for (let t = Date.UTC(1966, 0, 1); t <= Date.UTC(1971, 11, 31); t += 86400000) {
      const dt = new Date(t);
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth() + 1;
      const d = dt.getUTCDate();
      if (!isAcceptedBirthday(y, m, d)) continue;
      expect(isAcceptedSchoolYear(schoolYearOfBirth(y, m, d))).toBe(true);
    }
  });

  it("cohortRelation が中心からの位置を返す", () => {
    expect(cohortRelation(1967)).toBe("above");
    expect(cohortRelation(1968)).toBe("core");
    expect(cohortRelation(1969)).toBe("below");
    expect(cohortRelation(1970)).toBe("outside");
  });

  it("前後の学年に、弾かれたと読める言い方をしない", () => {
    for (const sy of [1967, 1969]) {
      const note = cohortNote(sy);
      expect(note).toContain("同じ校舎");
      expect(note).not.toContain("対象外");
      expect(note).not.toContain("ではありません");
    }
    expect(cohortNote(1968)).toContain("ど真ん中");
  });

  it("入学と卒業の年が、学年ごとに1年ずつずれる", () => {
    expect(cohortNote(1967)).toContain("1974年4月");
    expect(cohortNote(1967)).toContain("1986年3月");
    expect(cohortNote(1969)).toContain("1976年4月");
    expect(cohortNote(1969)).toContain("1988年3月");
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

describe("milestonesFor（前後の学年）", () => {
  // 成人式と入社は3学年でまるきり別の景色になる。
  // ここを一括りにすると「自分の年表」ではなくなり、学年で組む意味が消える。
  it("ひとつ上の学年は、昭和最後の成人式になる", () => {
    const ms = milestonesFor(1967);
    expect(ms.find((m) => m.title === "成人式")?.date).toBe("1988-01-15");
    expect(ms.find((m) => m.title === "成人式")?.note).toContain("昭和最後");
  });

  it("ひとつ下の学年は、平成に入って最初の成人式になる", () => {
    const ms = milestonesFor(1969);
    expect(ms.find((m) => m.title === "成人式")?.date).toBe("1990-01-15");
    expect(ms.find((m) => m.title === "成人式")?.note).toContain("平成");
  });

  it("入社の年が3学年で1年ずつずれる", () => {
    const nyusha = (sy: number) =>
      milestonesFor(sy).find((m) => m.title.startsWith("大学を卒業"))?.date;
    expect(nyusha(1967)).toBe("1990-04-01");
    expect(nyusha(1968)).toBe("1991-04-01");
    expect(nyusha(1969)).toBe("1992-04-01");
  });

  it("3学年とも、成人式と入社に固有の注記が入る（使い回しの一文にしない）", () => {
    const notes = [1967, 1968, 1969].flatMap((sy) =>
      milestonesFor(sy)
        .filter((m) => m.title === "成人式" || m.title.startsWith("大学を卒業"))
        .map((m) => m.note),
    );
    expect(new Set(notes).size).toBe(notes.length);
  });
});

describe("節目が二重に出ないこと", () => {
  // 節目（入学・卒業・成人式・入社）は milestonesFor() だけが持つ。
  // 以前は timeline_events にも 1968年度の実年月日で同じ行が入っており、
  // 自分年表に「小学校に入学」が 2 行並んでいた。
  // 3学年に広げると、これは重複では済まず
  // 「あなたが小学2年生のとき、小学校に入学」という表示になる。
  it("同じ日に同じ節目を2つ返さない", () => {
    for (const sy of [1967, 1968, 1969]) {
      const keys = milestonesFor(sy).map((m) => `${m.date} ${m.title}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("高校卒業の翌月に、進路が分かれる一行が入る", () => {
    const ms = milestonesFor(CORE_SCHOOL_YEAR);
    expect(ms.find((m) => m.title.startsWith("大学に入学"))?.date).toBe(
      "1987-04-01",
    );
  });
});
