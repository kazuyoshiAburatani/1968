import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseMedia, postImageUrl } from "@/lib/media";
import { deletePollPhoto, deleteResponsePhoto } from "./actions";

export const metadata: Metadata = { title: "写真の見張り" };

type Props = {
  searchParams: Promise<{ removed?: string; error?: string }>;
};

// 写真つき投稿の一覧。
//
// 写真は投稿された瞬間に他の人にも見える（承認待ちにしない）。
// 承認制にすると、運営がひとりの場では寝ている間の投稿が半日止まり、
// 「載った」という手応えも返らないので、会話が続かない。
//
// そのかわり、ここで新しい順に全部並べて、1 タップで写真だけ消せるようにしてある。
// 消すのは写真だけで、文章と投稿そのものは残す。投稿ごと消すと、書いた人には
// 「無かったこと」にされたように見えるが、写真だけなら会話は続く。
//
// 毎日 /admin/replies を空にするついでに、ここを上から眺めるのを想定している。
export default async function AdminMediaPage({ searchParams }: Props) {
  await requireAdmin();
  const { removed, error } = await searchParams;
  const sb = getSupabaseAdminClient();

  const [{ data: responseData }, { data: voteData }] = await Promise.all([
    sb
      .from("topic_responses")
      .select("id, user_id, body, media, created_at, topic_id")
      .neq("media", "[]")
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("poll_votes")
      .select(
        "poll_id, voter_key, user_id, choice, comment, image_path, created_at",
      )
      .not("image_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  type ResponseRow = {
    id: string;
    user_id: string;
    body: string;
    media: unknown;
    created_at: string;
    topic_id: string;
  };
  type VoteRow = {
    poll_id: string;
    voter_key: string;
    user_id: string | null;
    choice: string;
    comment: string | null;
    image_path: string;
    created_at: string;
  };

  const responses = ((responseData ?? []) as unknown) as ResponseRow[];
  const votes = ((voteData ?? []) as unknown) as VoteRow[];

  // 書いた人の名前を引く
  const userIds = [
    ...responses.map((r) => r.user_id),
    ...votes.map((v) => v.user_id).filter((v): v is string => v !== null),
  ];
  const nameBy = new Map<string, string>();
  if (userIds.length > 0) {
    const { data } = await sb
      .from("profiles")
      .select("user_id, nickname")
      .in("user_id", Array.from(new Set(userIds)));
    for (const p of (data ?? []) as { user_id: string; nickname: string }[]) {
      nameBy.set(p.user_id, p.nickname);
    }
  }

  // 二択の設問名
  const pollIds = Array.from(new Set(votes.map((v) => v.poll_id)));
  const questionBy = new Map<string, string>();
  if (pollIds.length > 0) {
    const { data } = await sb
      .from("polls")
      .select("id, question")
      .in("id", pollIds);
    for (const p of (data ?? []) as { id: string; question: string }[]) {
      questionBy.set(p.id, p.question);
    }
  }

  const items = [
    ...responses.flatMap((r) =>
      parseMedia(r.media).map((m) => ({
        kind: "response" as const,
        key: `r-${r.id}-${m.path}`,
        id: r.id,
        voterKey: null as string | null,
        pollId: null as string | null,
        path: m.path,
        who: nameBy.get(r.user_id) ?? "名無しの同級生",
        text: r.body,
        where: "お題への回答",
        href: `/topics/${r.topic_id}#response-${r.id}`,
        createdAt: r.created_at,
      })),
    ),
    ...votes.map((v) => ({
      kind: "vote" as const,
      key: `v-${v.poll_id}-${v.voter_key}`,
      id: v.poll_id,
      voterKey: v.voter_key as string | null,
      pollId: v.poll_id as string | null,
      path: v.image_path,
      who: v.user_id ? (nameBy.get(v.user_id) ?? "名無しの同級生") : "ゲスト",
      text: v.comment ?? "",
      where: `二択「${questionBy.get(v.poll_id) ?? "?"}」`,
      href: `/#poll-${v.poll_id}`,
      createdAt: v.created_at,
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">写真の見張り</h1>
        <p className="mt-2 text-sm leading-7 text-foreground/70">
          写真つきの投稿 {items.length} 件、新しい順。
          写真は投稿された時点で公開されています。
          気になるものがあれば、ここで写真だけ外してください。文章と投稿は残ります。
        </p>
        <p className="mt-1 text-xs leading-6 text-foreground/60">
          撮影場所の記録（GPS）は保存時に必ず消えています。見えているのは画像そのものだけです。
        </p>
      </header>

      {removed && (
        <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          写真を外しました。
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-6 text-center text-foreground/70">
          写真つきの投稿はまだありません。
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => {
            const url = postImageUrl(it.path);
            return (
              <li
                key={it.key}
                className="rounded-xl border border-border bg-background p-3"
              >
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {/* 管理画面なので next/image の最適化は要らない */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${it.who}さんの写真`}
                      className="h-48 w-full rounded-lg border border-border/60 object-contain bg-muted/40"
                    />
                  </a>
                )}
                <p className="mt-2 text-xs text-foreground/50">
                  {it.where}・
                  {new Date(it.createdAt).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })}
                </p>
                <p className="mt-0.5 text-sm font-bold">{it.who}</p>
                {it.text && (
                  <p className="mt-0.5 text-sm leading-7 text-foreground/80 line-clamp-3">
                    {it.text}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <Link
                    href={it.href}
                    className="text-sm no-underline hover:underline"
                  >
                    現場を見る
                  </Link>
                  <form
                    action={
                      it.kind === "response"
                        ? deleteResponsePhoto
                        : deletePollPhoto
                    }
                  >
                    {it.kind === "response" ? (
                      <input type="hidden" name="response_id" value={it.id} />
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name="poll_id"
                          value={it.pollId ?? ""}
                        />
                        <input
                          type="hidden"
                          name="voter_key"
                          value={it.voterKey ?? ""}
                        />
                      </>
                    )}
                    <button
                      type="submit"
                      className="text-sm text-foreground/50 hover:text-notification"
                    >
                      写真を外す
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
