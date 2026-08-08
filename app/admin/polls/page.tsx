import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { TOPIC_ERA_VALUES } from "@/lib/validation/topic";
import { createPoll, deletePoll, updatePoll } from "./actions";
import { PhotoPicker } from "@/components/photo-picker";
import { pollImageUrl } from "@/lib/media";

export const metadata: Metadata = { title: "二択の配信" };

type Poll = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_a_image: string | null;
  option_b_image: string | null;
  blurb: string;
  era: string | null;
  gender_lean: "male" | "female" | "both";
  published_at: string;
  expires_at: string | null;
  is_active: boolean;
};

type Props = {
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
};

// 二択の配信管理。
//
// 運用で守ること、
//  ・立ち上げ期は男性寄りを多めに（2 : 1 が目安）。ただし女性向けをゼロにはしない
//  ・全世代ネタ（きのこたけのこ等）は出さない。「うちの世代でやる意味ある？」と白ける
//  ・4 週間先まで仕込んでおく
//  ・写真は入れられるなら入れる。字だけより速く思い出せる。
//    ただし片方だけは不可（写真のあるほうが有利になって集計が歪む）
export default async function AdminPollsPage({ searchParams }: Props) {
  await requireAdmin();
  const { saved, error, edit } = await searchParams;
  const sb = getSupabaseAdminClient();

  const { data } = await sb
    .from("polls")
    .select(
      "id, question, option_a, option_b, option_a_image, option_b_image, blurb, era, gender_lean, published_at, expires_at, is_active",
    )
    .order("published_at", { ascending: false })
    .limit(200);

  const polls = ((data ?? []) as unknown) as Poll[];
  const editing = edit ? polls.find((p) => p.id === edit) : undefined;

  // 投票数
  const { data: voteData } = await sb.from("poll_votes").select("poll_id");
  const voteCount = new Map<string, number>();
  for (const v of (voteData ?? []) as { poll_id: string }[]) {
    voteCount.set(v.poll_id, (voteCount.get(v.poll_id) ?? 0) + 1);
  }

  const now = new Date();
  const queued = polls.filter(
    (p) => p.is_active && new Date(p.published_at) > now,
  );

  // 直近の配信予定が、男女で偏っていないかを見る
  const nextSix = [...queued]
    .sort((a, b) => (a.published_at < b.published_at ? -1 : 1))
    .slice(0, 6);
  const maleAhead = nextSix.filter((p) => p.gender_lean === "male").length;
  const femaleAhead = nextSix.filter((p) => p.gender_lean === "female").length;
  // 立ち上げ期は男性寄りを多めに出す方針なので、偏っていること自体は警告しない。
  // 女性向けが完全に消えたときだけ知らせる。3 週間ひとつも無い状態は行き過ぎ。
  const femaleGone = nextSix.length >= 6 && femaleAhead === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">二択の配信</h1>
        <p className="mt-2 text-sm leading-7 text-foreground/70">
          配信待ち {queued.length} 件。
          {queued.length < 4 && (
            <span className="ml-1 font-bold text-notification">
              4件を切っています。先の分を足してください。
            </span>
          )}
        </p>
        <p className="mt-1 text-sm leading-7 text-foreground/60">
          この先6件、男性寄り {maleAhead} 件・女性寄り {femaleAhead} 件。目安は
          4 : 2。
        </p>
        {femaleGone && (
          <p className="mt-2 rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm leading-7">
            この先6件に女性寄りがひとつもありません。
            男性寄りを多めに出す方針ですが、3週間まるごと女性向けが無いのは行き過ぎです。
            1〜2件、公開日時を前に出してください。
          </p>
        )}
      </header>

      {saved && (
        <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          保存しました。
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-background p-5">
        <h2 className="text-lg font-bold">
          {editing ? "二択を編集する" : "二択を追加する"}
        </h2>
        <PollForm initial={editing} />
      </section>

      <section>
        <h2 className="text-lg font-bold">一覧</h2>
        <ul className="mt-3 space-y-3">
          {polls.map((p) => {
            const isLive =
              p.is_active &&
              new Date(p.published_at) <= now &&
              (p.expires_at == null || new Date(p.expires_at) > now);
            const isFuture = p.is_active && new Date(p.published_at) > now;
            return (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={
                          "px-2 py-0.5 rounded-full font-bold " +
                          (isLive
                            ? "bg-primary/10 text-primary"
                            : isFuture
                              ? "bg-accent/20 text-accent"
                              : "bg-muted text-foreground/60")
                        }
                      >
                        {isLive ? "公開中" : isFuture ? "配信待ち" : "停止中"}
                      </span>
                      <span className="text-foreground/50">
                        {p.gender_lean === "male"
                          ? "男性寄り"
                          : p.gender_lean === "female"
                            ? "女性寄り"
                            : "男女共通"}
                      </span>
                      {p.era && <span className="text-foreground/50">{p.era}</span>}
                      <span className="text-foreground/50">
                        {voteCount.get(p.id) ?? 0} 票
                      </span>
                    </div>
                    <p className="mt-1.5 font-bold leading-7">{p.question}</p>
                    <p className="mt-0.5 text-sm text-foreground/70">
                      {p.option_a} ／ {p.option_b}
                    </p>
                    {p.option_a_image && p.option_b_image && (
                      <div className="mt-1.5 flex gap-1.5">
                        {[p.option_a_image, p.option_b_image].map((path) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={path}
                            src={pollImageUrl(path) ?? ""}
                            alt=""
                            className="size-12 rounded border border-border object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {new Date(p.published_at).toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      })}
                      公開
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/admin/polls?edit=${p.id}`}
                      className="text-sm no-underline hover:underline"
                    >
                      編集
                    </a>
                    <form action={deletePoll}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="text-sm text-foreground/50 hover:text-notification"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function PollForm({ initial }: { initial?: Poll }) {
  const action = initial ? updatePoll : createPoll;
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <form action={action} className="mt-4 space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="question" className="block text-sm font-bold mb-1">
          設問
        </label>
        <input
          id="question"
          name="question"
          required
          maxLength={120}
          defaultValue={initial?.question}
          placeholder="土曜8時、どっち派だった？"
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="option_a" className="block text-sm font-bold mb-1">
            左の選択肢
          </label>
          <input
            id="option_a"
            name="option_a"
            required
            maxLength={60}
            defaultValue={initial?.option_a}
            placeholder="8時だョ!全員集合"
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <div>
          <label htmlFor="option_b" className="block text-sm font-bold mb-1">
            右の選択肢
          </label>
          <input
            id="option_b"
            name="option_b"
            required
            maxLength={60}
            defaultValue={initial?.option_b}
            placeholder="オレたちひょうきん族"
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
      </div>

      <fieldset className="rounded-xl border border-border/70 p-4">
        <legend className="px-1 text-sm font-bold">選択肢の写真（任意）</legend>
        <p className="text-xs leading-6 text-foreground/60">
          両方そろえて入れてください。片方だけだと、写真のあるほうが選ばれやすくなり、
          集計が意味を持たなくなります。位置情報は保存時に消えます。
          <br />
          出典に気をつけてください。雑誌の表紙や商品の写真は、撮った人・作った人に権利があります。
          自分で撮ったもの、自分が持っているものを写したものが安全です。
        </p>

        <div className="mt-3 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-bold mb-1.5">左の選択肢の写真</p>
            {initial?.option_a_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pollImageUrl(initial.option_a_image) ?? ""}
                alt="いま入っている左の写真"
                className="mb-2 h-24 w-full rounded-lg border border-border object-cover"
              />
            )}
            <PhotoPicker name="option_a_photo" label="写真を選ぶ" />
          </div>
          <div>
            <p className="text-sm font-bold mb-1.5">右の選択肢の写真</p>
            {initial?.option_b_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pollImageUrl(initial.option_b_image) ?? ""}
                alt="いま入っている右の写真"
                className="mb-2 h-24 w-full rounded-lg border border-border object-cover"
              />
            )}
            <PhotoPicker name="option_b_photo" label="写真を選ぶ" />
          </div>
        </div>

        {initial?.option_a_image && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="clear_images" value="1" className="size-5" />
            写真を外して、字だけに戻す
          </label>
        )}
      </fieldset>

      <div>
        <label htmlFor="blurb" className="block text-sm font-bold mb-1">
          解説（投票前に表示されます）
        </label>
        <textarea
          id="blurb"
          name="blurb"
          rows={2}
          maxLength={300}
          defaultValue={initial?.blurb}
          placeholder="ひょうきん族が始まったのは1981年、ちょうど中1の年。土曜夜のチャンネル権争いが家庭で勃発した。"
          className="w-full px-3 py-2 rounded border border-border bg-background"
        />
        <p className="mt-1 text-xs leading-6 text-foreground/60">
          設問のすぐ下、選択肢の上に出ます。当時の背景を先に読んでもらうと記憶が戻りやすくなります。
          ただし<strong>どちらが多数派かを匂わせる書き方はしないでください</strong>。選ぶ前に読まれるので、回答が歪みます。
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="era" className="block text-sm font-bold mb-1">
            いつの話か
          </label>
          <select
            id="era"
            name="era"
            defaultValue={initial?.era ?? ""}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            <option value="">指定なし</option>
            {TOPIC_ERA_VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gender_lean" className="block text-sm font-bold mb-1">
            どちら寄りの話題か
          </label>
          <select
            id="gender_lean"
            name="gender_lean"
            defaultValue={initial?.gender_lean ?? "both"}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          >
            <option value="both">男女共通</option>
            <option value="male">男性寄り</option>
            <option value="female">女性寄り</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="published_at" className="block text-sm font-bold mb-1">
            公開日時
          </label>
          <input
            id="published_at"
            name="published_at"
            type="datetime-local"
            required
            defaultValue={toLocal(initial?.published_at ?? new Date().toISOString())}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <div>
          <label htmlFor="expires_at" className="block text-sm font-bold mb-1">
            終了日時（任意）
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            defaultValue={toLocal(initial?.expires_at ?? null)}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial ? initial.is_active : true}
          className="size-5"
        />
        有効にする
      </label>

      <button
        type="submit"
        className="min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-bold"
      >
        {initial ? "更新する" : "追加する"}
      </button>
    </form>
  );
}
