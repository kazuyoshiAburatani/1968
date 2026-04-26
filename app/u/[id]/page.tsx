import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRank } from "@/lib/auth/current-rank";

// 他会員のプロフィール表示。
// profiles テーブルのニックネームはフォーラム機能の都合で広く読み取り可だが、
// プロフィール詳細ページの開示制御はこの層で bio_visible を見て行う。
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { rank, userId: viewerId } = await getCurrentRank(supabase);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nickname, birth_month, birth_day, gender, prefecture, hometown, school, occupation, introduction, bio_visible",
    )
    .eq("user_id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const isSelf = viewerId === id;
  if (!isSelf) {
    // bio_visible による開示制御
    if (profile.bio_visible === "private") {
      notFound();
    }
    if (
      profile.bio_visible === "members_only" &&
      rank !== "member" &&
      rank !== "regular"
    ) {
      notFound();
    }
  }

  // DM 可否、自分自身は除外、双方 regular かつ相手が AI でない
  const { data: peerInfo } = await supabase
    .from("member_display")
    .select("user_id, membership_rank, is_ai_persona")
    .eq("user_id", id)
    .maybeSingle();
  const peerRank = peerInfo?.membership_rank as
    | "member"
    | "regular"
    | undefined;
  const peerIsAi = peerInfo?.is_ai_persona === true;
  const canDm =
    !isSelf && rank === "regular" && peerRank === "regular" && !peerIsAi;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <nav className="mb-6 text-sm">
        <Link href="/mypage">← マイページへ戻る</Link>
      </nav>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{profile.nickname}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            1968年{profile.birth_month}月{profile.birth_day}日生まれ
          </p>
        </div>
        {canDm && (
          <Link
            href={`/messages/${id}`}
            className="inline-flex items-center gap-2 min-h-[var(--spacing-tap)] px-4 rounded-full border border-primary text-primary bg-background hover:bg-muted no-underline text-sm font-medium shrink-0"
          >
            <i className="ri-mail-send-line" aria-hidden />
            メッセージを送る
          </Link>
        )}
      </header>

      {profile.introduction && (
        <section className="mt-8">
          <h2 className="font-bold">自己紹介</h2>
          <p className="mt-2 whitespace-pre-wrap">{profile.introduction}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold">基本情報</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {profile.gender && (
            <>
              <dt className="text-foreground/70">性別</dt>
              <dd>{renderGender(profile.gender)}</dd>
            </>
          )}
          {profile.prefecture && (
            <>
              <dt className="text-foreground/70">お住まい</dt>
              <dd>{profile.prefecture}</dd>
            </>
          )}
          {profile.hometown && (
            <>
              <dt className="text-foreground/70">出身地</dt>
              <dd>{profile.hometown}</dd>
            </>
          )}
          {profile.school && (
            <>
              <dt className="text-foreground/70">学校</dt>
              <dd>{profile.school}</dd>
            </>
          )}
          {profile.occupation && (
            <>
              <dt className="text-foreground/70">職業</dt>
              <dd>{profile.occupation}</dd>
            </>
          )}
        </dl>
      </section>
    </div>
  );
}

function renderGender(g: string): string {
  if (g === "male") return "男性";
  if (g === "female") return "女性";
  if (g === "other") return "その他";
  if (g === "prefer_not_to_say") return "非公開";
  return "-";
}
