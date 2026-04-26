import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendMessage } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { MessagesRealtime } from "@/components/messages-realtime";
import { MarkReadOnMount } from "@/components/messages-mark-read";

type Props = {
  params: Promise<{ peer: string }>;
  searchParams: Promise<{ error?: string }>;
};

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { peer } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: prof } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("user_id", peer)
    .maybeSingle();
  return { title: prof?.nickname ? `${prof.nickname} さんとのトーク` : "トーク" };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PeerMessagesPage({
  params,
  searchParams,
}: Props) {
  const { peer } = await params;
  const { error } = await searchParams;

  if (!UUID_RE.test(peer)) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/messages/${peer}`)}`);

  if (peer === user.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm">自分自身とのトークはできません。</p>
        <p className="mt-4">
          <Link href="/messages" className="underline">
            ← トーク一覧へ
          </Link>
        </p>
      </div>
    );
  }

  // 自分と相手のランクを確認、片方でも regular でなければ送信不可
  const { data: meRow } = await supabase
    .from("users")
    .select("membership_rank")
    .eq("id", user.id)
    .maybeSingle();
  const myRank = meRow?.membership_rank as "member" | "regular" | undefined;

  const { data: peerInfo } = await supabase
    .from("member_display")
    .select("user_id, membership_rank, is_ai_persona")
    .eq("user_id", peer)
    .maybeSingle();
  const peerRank = peerInfo?.membership_rank as
    | "member"
    | "regular"
    | undefined;
  const peerIsAi = peerInfo?.is_ai_persona === true;

  const { data: peerProfile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("user_id", peer)
    .maybeSingle();
  const peerName = peerProfile?.nickname ?? "（不明な方）";

  const canSend = myRank === "regular" && peerRank === "regular" && !peerIsAi;

  // 過去メッセージを古い順で取得（最大 200 件）
  const { data: msgRows } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, body, read_at, created_at")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${peer}),and(sender_id.eq.${peer},receiver_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(200);
  const msgs = (msgRows ?? []) as MessageRow[];

  return (
    <div className="mx-auto max-w-2xl flex flex-col min-h-[calc(100dvh-128px)] md:min-h-[calc(100dvh-160px)]">
      {/* 上部、相手情報 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/messages"
          aria-label="トーク一覧へ戻る"
          className="text-foreground/70 hover:text-foreground"
        >
          <i className="ri-arrow-left-line text-xl" aria-hidden />
        </Link>
        <Link
          href={`/u/${peer}`}
          className="flex items-center gap-2 no-underline flex-1 min-w-0"
        >
          <span
            aria-hidden
            className="inline-flex items-center justify-center size-9 rounded-full bg-muted text-base font-bold text-foreground/70 shrink-0"
          >
            {peerName.slice(0, 1)}
          </span>
          <span className="font-bold truncate">{peerName}</span>
          {peerIsAi && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-px rounded shrink-0">
              運営AI
            </span>
          )}
        </Link>
      </header>

      {/* メッセージスクロール領域 */}
      <div
        id="messages-scroll"
        className="flex-1 overflow-y-auto px-4 py-4 bg-muted/20"
      >
        {msgs.length === 0 ? (
          <p className="text-center text-sm text-foreground/60 mt-12">
            まだメッセージはありません。
            {canSend ? "最初の一言、書いてみませんか。" : ""}
          </p>
        ) : (
          <ul className="space-y-3">
            {msgs.map((m, i) => {
              const mine = m.sender_id === user.id;
              const showDate =
                i === 0 ||
                new Date(m.created_at).toDateString() !==
                  new Date(msgs[i - 1].created_at).toDateString();
              return (
                <li key={m.id}>
                  {showDate && (
                    <p className="text-center text-xs text-foreground/60 my-3">
                      {new Date(m.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  <div
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`rounded-2xl px-4 py-2.5 leading-7 text-sm whitespace-pre-wrap ${
                          mine
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-background border border-border rounded-bl-sm"
                        }`}
                      >
                        {m.body}
                      </div>
                      <div
                        className={`mt-1 text-[10px] text-foreground/50 flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}
                      >
                        {mine && m.read_at && <span>既読</span>}
                        <span>
                          {new Date(m.created_at).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 入力エリア、固定 */}
      <div className="sticky bottom-0 bg-background border-t border-border px-3 py-3">
        {error && (
          <p className="mb-2 px-2 text-xs text-red-700">
            {decodeURIComponent(error)}
          </p>
        )}
        {!canSend ? (
          <div className="px-2 py-3 text-sm text-foreground/70">
            {peerIsAi
              ? "運営AIへのメッセージは受け付けていません。"
              : peerRank !== "regular"
                ? "お相手が正会員でないため、メッセージを送れません。"
                : "メッセージを送るには正会員へのお手続きが必要です。"}
            <p className="mt-2">
              <Link href="/mypage" className="underline">
                → マイページへ
              </Link>
            </p>
          </div>
        ) : (
          <form action={sendMessage} className="flex items-end gap-2">
            <input type="hidden" name="receiver_id" value={peer} />
            <textarea
              name="body"
              required
              rows={1}
              maxLength={2000}
              placeholder="メッセージを入力"
              className="flex-1 px-3 py-2 rounded-2xl border border-border bg-background resize-none min-h-[44px] max-h-32 text-sm leading-6"
            />
            <SubmitButton pendingText="送信中…">送信</SubmitButton>
          </form>
        )}
      </div>

      {/* Realtime 監視と既読化、クライアントサイド */}
      <MessagesRealtime
        peerId={peer}
        currentUserId={user.id}
      />
      <MarkReadOnMount peerId={peer} />
    </div>
  );
}
