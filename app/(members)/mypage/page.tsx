import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { MembershipBadge } from "@/components/membership-badge";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "マイページ",
};

type Rank = "guest" | "member" | "regular";

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
          <p className="mt-1 text-foreground/80">
            {profile?.nickname ?? "ゲスト"} さん
          </p>
        </div>
        <MembershipBadge rank={rank} verified={verified} />
      </header>

      {saved && (
        <div className="mt-4 rounded-lg border border-primary/40 bg-muted/40 p-3 text-sm">
          プロフィールを保存しました。
        </div>
      )}

      {rank === "member" && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="font-bold">正会員について</h2>
          <p className="mt-1 text-sm text-foreground/80">
            月額480円の正会員にアップグレードすると、介護・夫婦・健康・お金などの全カテゴリに投稿でき、オフ会やメッセージも利用できます。
          </p>
          <p className="mt-3 text-sm text-foreground/60">
            決済はフェーズ4で追加予定、いましばらくお待ちください。
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold text-lg">プロフィール</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-foreground/70">ニックネーム</dt>
          <dd>{profile?.nickname ?? "未設定"}</dd>
          <dt className="text-foreground/70">誕生日</dt>
          <dd>1968年{profile?.birth_month}月{profile?.birth_day}日</dd>
          <dt className="text-foreground/70">都道府県</dt>
          <dd>{profile?.prefecture ?? "未設定"}</dd>
          <dt className="text-foreground/70">公開範囲</dt>
          <dd>
            {profile?.bio_visible === "public" && "誰でも閲覧可"}
            {profile?.bio_visible === "members_only" && "会員のみ"}
            {profile?.bio_visible === "private" && "自分だけ"}
          </dd>
        </dl>
        <p className="mt-4">
          <Link
            href="/mypage/profile"
            className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border no-underline hover:bg-muted"
          >
            プロフィールを編集
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-bold text-lg">アカウント</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-foreground/70">メール</dt>
          <dd>{publicUser?.email}</dd>
          <dt className="text-foreground/70">ステータス</dt>
          <dd>{publicUser?.status}</dd>
          <dt className="text-foreground/70">登録日</dt>
          <dd>
            {publicUser?.created_at
              ? new Date(publicUser.created_at).toLocaleDateString("ja-JP")
              : "-"}
          </dd>
        </dl>
      </section>

      <section className="mt-10 pt-8 border-t border-border">
        <form action="/auth/signout" method="post">
          <SubmitButton variant="outline" pendingText="ログアウト中…">
            ログアウト
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
