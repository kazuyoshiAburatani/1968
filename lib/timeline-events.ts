import type { SupabaseClient } from "@supabase/supabase-js";
import {
  whenPhrase,
  milestonesFor,
  schoolYearOfBirth,
  parseCivilDate,
  todayInTokyo,
  nendoOfDate,
} from "@/lib/school-year";

// 年表イベントの読み出しと、自分年表の組み立て。
// 「今日は何の日」も同じテーブルから引く。

export type TimelineEvent = {
  id: string;
  event_date: string;
  title: string;
  note: string;
  genre: string | null;
  gender_lean: "male" | "female" | "both";
};

export type PersonalEvent = {
  date: string;
  title: string;
  note: string;
  genre: string | null;
  /** 「あなたが中学2年生のとき」 */
  when: string;
  /** 学校の節目（入学・卒業・成人式）かどうか */
  milestone: boolean;
};

/** 今日（日本時間）と同じ月日の出来事。 */
export async function loadTodayEvents(
  supabase: SupabaseClient,
  limit = 3,
): Promise<TimelineEvent[]> {
  const today = todayInTokyo();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  // 式インデックスを効かせるため、月日だけで絞る RPC ではなく範囲条件を並べる。
  // 件数が 120 件程度なので、全件取ってアプリ側で絞っても実害はない。
  const { data } = await supabase
    .from("timeline_events")
    .select("id, event_date, title, note, genre, gender_lean")
    .eq("is_active", true);

  const all = ((data ?? []) as unknown) as TimelineEvent[];
  const sameDay = all.filter((e) => {
    const d = parseCivilDate(e.event_date);
    return d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
  });

  if (sameDay.length > 0) return sameDay.slice(0, limit);

  // ぴったり同じ日が無い日も多いので、同じ月の出来事で代替する。
  // 毎日ひとつは必ず何かが出る状態にしておかないと、日課にならない。
  const sameMonth = all.filter((e) => {
    const d = parseCivilDate(e.event_date);
    return d.getUTCMonth() + 1 === month;
  });
  return sameMonth
    .sort((a, b) => (a.event_date < b.event_date ? -1 : 1))
    .slice(0, limit);
}

/**
 * 誕生日から、自分専用の年表を組み立てる。
 *
 * 早生まれの人が最初に確かめるのがここで、学年計算が合っていれば信頼が跳ね上がり、
 * ズレていれば「やっぱり早生まれのことなんて考えていない」と離脱する。
 * したがって「あなたが○歳のとき」ではなく、在学中は必ず学年で書く。
 */
export async function buildPersonalTimeline(
  supabase: SupabaseClient,
  birth: { year: number; month: number; day: number },
): Promise<PersonalEvent[]> {
  const { data } = await supabase
    .from("timeline_events")
    .select("id, event_date, title, note, genre, gender_lean")
    .eq("is_active", true)
    .order("event_date", { ascending: true });

  const events = ((data ?? []) as unknown) as TimelineEvent[];
  const schoolYear = schoolYearOfBirth(birth.year, birth.month, birth.day);

  const fromDb: PersonalEvent[] = events.map((e) => {
    const d = parseCivilDate(e.event_date);
    return {
      date: e.event_date,
      title: e.title,
      note: e.note,
      genre: e.genre,
      when: whenPhrase(birth, d),
      milestone: false,
    };
  });

  const fromMilestones: PersonalEvent[] = milestonesFor(schoolYear).map((m) => {
    const d = parseCivilDate(m.date);
    return {
      date: m.date,
      title: m.title,
      note: m.note,
      genre: "学校生活",
      when: whenPhrase(birth, d),
      milestone: true,
    };
  });

  return [...fromDb, ...fromMilestones].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

/** 年表を「小学校」「中学」…の塊に切り分ける。読み物として読ませるため。 */
export function groupByChapter(
  events: PersonalEvent[],
  birth: { year: number; month: number; day: number },
): { chapter: string; events: PersonalEvent[] }[] {
  const sy = schoolYearOfBirth(birth.year, birth.month, birth.day);
  const bounds: { chapter: string; from: number; to: number }[] = [
    { chapter: "小学校のころ", from: sy + 7, to: sy + 12 },
    { chapter: "中学のころ", from: sy + 13, to: sy + 15 },
    { chapter: "高校のころ", from: sy + 16, to: sy + 18 },
    { chapter: "十代の終わりから、社会に出るまで", from: sy + 19, to: sy + 23 },
    { chapter: "それから、今日まで", from: sy + 24, to: 9999 },
  ];

  const out: { chapter: string; events: PersonalEvent[] }[] = [];
  for (const b of bounds) {
    const inRange = events.filter((e) => {
      const nendo = nendoOfDate(parseCivilDate(e.date));
      return nendo >= b.from && nendo <= b.to;
    });
    if (inRange.length > 0) out.push({ chapter: b.chapter, events: inRange });
  }

  // 小学校入学より前の出来事があれば先頭に置く
  const before = events.filter((e) => {
    return nendoOfDate(parseCivilDate(e.date)) < sy + 7;
  });
  if (before.length > 0) {
    out.unshift({ chapter: "生まれてから、小学校に上がるまで", events: before });
  }

  return out;
}
