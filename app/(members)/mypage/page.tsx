import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { MembershipBadge } from "@/components/membership-badge";
import { SubmitButton } from "@/components/submit-button";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUploader } from "@/components/avatar-uploader";
import { publicAvatarUrl } from "@/lib/avatar";
import { linkEmail } from "@/app/join/actions";
import { schoolYearLabel, isCoreCohort } from "@/lib/school-year";

export const metadata: Metadata = {
  title: "マイページ",
};

type Props = {
  searchParams: Promise<{
    saved?: string;
    email_sent?: string;
    error?: string;
  }>;
};

// マイページ。
//
// 課金も身分証も無くなったので、ここに残す用件は 3 つだけになった。
//   1. 自分が誰として見えているかの確認（ニックネーム・写真）
//   2. 機種変更に備えたメールの紐付け（匿名登録のままだと端末を変えると戻れない）
//   3. 自分が書いたものの一覧と、退会
export default async function MyPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { saved, email_sent, error } = await searchParams;

  const [{ data: publicUser }, { data: profile }] = await Promise.all([
    supabase
      .from("users")
      .select("email, is_founding_member, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "nickname, birth_year, birth_month, birth_day, school_year, prefecture, avatar_url",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const avatarUrl = publicAvatarUrl(
    (profile?.avatar_url as string | null | undefined) ?? null,
  );
  const isFoundingMember = publicUser?.is_founding_member === true;
  const hasEmail = !!user.email;
  const schoolYear = (profile?.school_year as number | null) ?? null;

  // 自分の投稿
  const { data: myPosts } = await supabase
    .from("topic_responses")
    .select("id, body, created_at, topic_id, featured_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const posts = (myPosts ?? []) as {
    id: string;
    body: string;
    created_at: string;
    topic_id: string;
    featured_at: string | null;
  }[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">マイページ</h1>
        <MembershipBadge isFoundingMember={isFoundingMember} />
      </header>

      {saved === "1" && (
        <p role="status" className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          保存しました。
        </p>
      )}
      {email_sent === "1" && (
        <p role="status" className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm leading-7">
          確認のメールをお送りしました。届いたメールのリンクを開くと、紐付けが完了します。
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm leading-7">
          {error}
        </p>
      )}

      {/* あなたの席 */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={profile?.nickname ?? "あなた"}
            avatarUrl={avatarUrl}
            size={72}
          />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold truncate">
              {profile?.nickname ?? "名無しの同級生"} さん
            </p>
            {schoolYear != null && (
              <p className="mt-0.5 text-sm text-foreground/70">
                {schoolYearLabel(schoolYear)}
                {isCoreCohort(schoolYear) && "、この集まりのど真ん中の学年です"}
              </p>
            )}
            {profile?.birth_month && (
              <p className="mt-0.5 text-xs text-foreground/50">
                {profile.birth_year}年{profile.birth_month}月
                {profile.birth_day}日生まれ
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <AvatarUploader hasAvatar={!!avatarUrl} />
        </div>

        <Link
          href="/mypage/profile"
          className="mt-4 inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full border border-border text-sm font-medium no-underline hover:bg-muted"
        >
          ニックネームや自己紹介を変える
        </Link>
      </section>

      {/* 機種変更への備え */}
      <section
        className={
          "rounded-2xl border p-5 " +
          (hasEmail
            ? "border-border bg-background"
            : "border-accent/60 bg-accent/5")
        }
      >
        <h2 className="text-base font-bold">
          {hasEmail ? "引き継ぎの設定" : "機種変更に備えておきませんか"}
        </h2>

        {hasEmail ? (
          <p className="mt-2 text-sm leading-7 text-foreground/70">
            {publicUser?.email ?? user.email} を登録済みです。
            端末を変えても、このメールアドレスでログインすれば同じ席に戻れます。
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-7 text-foreground/70">
              いまはこの端末のブラウザにだけ、あなたの席が結びついています。
              スマホを買い替えたり、履歴を消したりすると戻れなくなります。
              <br />
              メールアドレスを 1 つ登録しておくと、そのとき元の席に戻れます。
              パスワードは要りません。
            </p>
            <form action={linkEmail} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="メールアドレス"
                autoComplete="email"
                className="flex-1 min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <SubmitButton className="min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white font-bold">
                登録する
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs leading-6 text-foreground/60">
              メールは引き継ぎにだけ使います。宣伝は送りません。
            </p>
          </>
        )}
      </section>

      {/* 書いたもの */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <h2 className="text-base font-bold">あなたが書いたもの</h2>
        {posts.length === 0 ? (
          <p className="mt-2 text-sm leading-7 text-foreground/70">
            まだありません。
            <Link href="/" className="mx-1">
              今週のお題
            </Link>
            に一行、置いてみませんか。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/topics/${p.topic_id}#response-${p.id}`}
                  className="block rounded-xl border border-border/60 px-3 py-2.5 no-underline hover:bg-muted/40"
                >
                  {p.featured_at && (
                    <span className="mr-2 inline-block px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold">
                      お便り紹介
                    </span>
                  )}
                  <span className="text-sm leading-7 text-foreground line-clamp-2">
                    {p.body}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 退会・ログアウト */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <h2 className="text-base font-bold">その他</h2>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full border border-border text-sm font-medium hover:bg-muted"
            >
              ログアウト
            </button>
          </form>
          <Link
            href="/mypage/leave"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full text-sm text-foreground/60 no-underline hover:text-notification"
          >
            退会について
          </Link>
        </div>
      </section>
    </div>
  );
}
