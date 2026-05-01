import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAuthorInfo } from "@/lib/author-info";
import { UserAvatar } from "@/components/user-avatar";

export const metadata: Metadata = {
  title: "トーク",
};

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Conversation = {
  peerId: string;
  lastBody: string;
  lastAt: string;
  unreadCount: number;
  iSent: boolean;
};

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const d = new Date(iso);
  const today = new Date();
  if (d.getFullYear() === today.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function preview(body: string, max = 40): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max) + "…" : oneLine;
}

export default async function MessagesIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">トーク</h1>
        <p className="mt-3 text-sm text-foreground/70">
          正会員どうしのダイレクトメッセージ機能です。
        </p>
        <div className="mt-8 rounded-lg border border-border bg-background p-5 text-sm">
          <p>トークのご利用には、会員登録とログインが必要です。</p>
          <p className="mt-3">
            <Link
              href="/register"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white no-underline font-medium"
            >
              会員登録（無料）
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ランクチェック
  const { data: me } = await supabase
    .from("users")
    .select("membership_rank")
    .eq("id", user.id)
    .maybeSingle();
  const rank = (me?.membership_rank ?? "member") as "member" | "verified";

  if (rank !== "verified") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">トーク</h1>
        <p className="mt-3 text-sm text-foreground/70">
          ダイレクトメッセージ機能は正会員のみご利用いただけます。
        </p>
        <div className="mt-8 rounded-2xl border border-primary/30 bg-muted/40 p-6">
          <p className="font-bold">正会員になると</p>
          <ul className="mt-3 text-sm text-foreground/85 space-y-1.5 list-disc pl-5">
            <li>同年代どうしの 1 対 1 トーク</li>
            <li>全 12 カテゴリ閲覧・投稿</li>
            <li>オフ会の参加（入会3ヶ月以上）</li>
          </ul>
          <p className="mt-5">
            <Link
              href="/mypage"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white no-underline font-medium"
            >
              マイページから手続きへ
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // 自分が関わるメッセージを新しい順に取得（最大 200 件）→ ペアごとに最新を抽出
  const { data: msgRows } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, body, read_at, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(200);
  const msgs = (msgRows ?? []) as MessageRow[];

  const convMap = new Map<string, Conversation>();
  for (const m of msgs) {
    const peer = m.sender_id === user.id ? m.receiver_id : m.sender_id;
    let conv = convMap.get(peer);
    if (!conv) {
      conv = {
        peerId: peer,
        lastBody: m.body,
        lastAt: m.created_at,
        unreadCount: 0,
        iSent: m.sender_id === user.id,
      };
      convMap.set(peer, conv);
    }
    if (m.receiver_id === user.id && m.read_at === null) {
      conv.unreadCount += 1;
    }
  }
  const conversations = Array.from(convMap.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  // 相手のニックネームをまとめ取得
  const authorMap = await fetchAuthorInfo(
    supabase,
    conversations.map((c) => c.peerId),
  );

  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-6 sm:py-10">
      <header className="px-4 sm:px-0 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">トーク</h1>
        <p className="text-xs text-foreground/60">
          {conversations.length} 件
        </p>
      </header>
      <p className="px-4 sm:px-0 mt-2 text-xs text-foreground/60 leading-6">
        ※ ダイレクトメッセージは、本人と運営の三者が閲覧できる仕様です。詳しくは
        <Link href="/terms" className="underline">利用規約</Link>
        第13条をご覧ください。
      </p>

      {conversations.length === 0 ? (
        <div className="mt-10 px-4 sm:px-0">
          <div className="rounded-2xl border border-border bg-muted/30 p-6 text-sm text-foreground/80 leading-7">
            <p>まだメッセージはありません。</p>
            <p className="mt-2">
              気になる方のプロフィールから「メッセージを送る」を押してみませんか。
            </p>
            <p className="mt-4">
              <Link href="/board" className="underline">
                → 掲示板で気になる方を見つける
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border bg-background sm:rounded-xl sm:border">
          {conversations.map((c) => {
            const author = authorMap.get(c.peerId);
            const nickname = author?.nickname ?? "（不明な方）";
            const avatarUrl = author?.avatarUrl ?? null;
            const isAi = author?.isAi === true;
            return (
              <li key={c.peerId}>
                <Link
                  href={`/messages/${c.peerId}`}
                  className="flex items-start gap-3 px-4 py-3.5 no-underline hover:bg-muted/40 active:bg-muted/70 transition-colors"
                >
                  <UserAvatar
                    name={nickname}
                    avatarUrl={avatarUrl}
                    isAi={isAi}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-foreground truncate">
                        {nickname}
                      </p>
                      <span className="text-xs text-foreground/60 shrink-0">
                        {formatRelative(c.lastAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/70 line-clamp-1">
                      {c.iSent && <span className="text-foreground/50">自分、</span>}
                      {preview(c.lastBody, 40)}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span
                      aria-label={`未読 ${c.unreadCount} 件`}
                      className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold"
                    >
                      {c.unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
