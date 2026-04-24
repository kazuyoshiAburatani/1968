import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { MembershipBadge } from "@/components/membership-badge";

export const metadata: Metadata = {
  title: "マイページ",
};

type Rank = "guest" | "pending" | "associate" | "regular";

type Props = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function MyPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { saved } = await searchParams;

  const { data: publicUser } = await supabase
    .from("users")
    .select("email, membership_rank, status, stripe_customer_id, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, birth_month, birth_day, prefecture, bio_visible")
    .eq("user_id", user.id)
    .maybeSingle();

  // verifications テーブルはフェーズ5で実装、現状は false 固定
  const verified = false;

  const rank = (publicUser?.membership_rank ?? "guest") as Rank;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">マイページ</h1>
          <p className="mt-1 text-[color:var(--color-foreground)]/80">
            {profile?.nickname ?? "ゲスト"} さん
          </p>
        </div>
        <MembershipBadge rank={rank} verified={verified} />
      </header>

      {saved && (
        <div className="mt-4 rounded-lg border border-[color:var(--color-primary)]/40 bg-[color:var(--color-muted)]/40 p-3 text-sm">
          プロフィールを保存しました。
        </div>
      )}

      {rank === "pending" && (
        <section className="mt-8 rounded-lg border border-[color:var(--color-accent)]/40 bg-[color:var(--color-muted)]/40 p-4">
          <h2 className="font-bold">準会員へのご案内</h2>
          <p className="mt-1 text-sm">
            現在は登録のみが完了している状態です。月額180円のお支払いを完了すると、段階A・Bカテゴリの閲覧と投稿が可能になります。
          </p>
          <p className="mt-3 text-sm text-[color:var(--color-foreground)]/60">
            決済機能はフェーズ4で追加予定、しばらくお待ちください。
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold text-lg">プロフィール</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-[color:var(--color-foreground)]/70">ニックネーム</dt>
          <dd>{profile?.nickname ?? "未設定"}</dd>
          <dt className="text-[color:var(--color-foreground)]/70">誕生日</dt>
          <dd>1968年{profile?.birth_month}月{profile?.birth_day}日</dd>
          <dt className="text-[color:var(--color-foreground)]/70">都道府県</dt>
          <dd>{profile?.prefecture ?? "未設定"}</dd>
          <dt className="text-[color:var(--color-foreground)]/70">公開範囲</dt>
          <dd>
            {profile?.bio_visible === "public" && "誰でも閲覧可"}
            {profile?.bio_visible === "members_only" && "会員のみ"}
            {profile?.bio_visible === "private" && "自分だけ"}
          </dd>
        </dl>
        <p className="mt-4">
          <Link
            href="/mypage/profile"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-[color:var(--color-border)] no-underline hover:bg-[color:var(--color-muted)]"
          >
            プロフィールを編集
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-bold text-lg">アカウント</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-[color:var(--color-foreground)]/70">メール</dt>
          <dd>{publicUser?.email}</dd>
          <dt className="text-[color:var(--color-foreground)]/70">ステータス</dt>
          <dd>{publicUser?.status}</dd>
          <dt className="text-[color:var(--color-foreground)]/70">登録日</dt>
          <dd>
            {publicUser?.created_at
              ? new Date(publicUser.created_at).toLocaleDateString("ja-JP")
              : "-"}
          </dd>
        </dl>
      </section>

      <section className="mt-10 pt-8 border-t border-[color:var(--color-border)]">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-[color:var(--color-border)] text-[color:var(--color-foreground)]/80 hover:bg-[color:var(--color-muted)]"
          >
            ログアウト
          </button>
        </form>
      </section>
    </div>
  );
}
