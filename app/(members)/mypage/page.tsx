import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { MembershipBadge } from "@/components/membership-badge";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "マイページ",
};

type Rank = "guest" | "member" | "regular";

type Subscription = {
  stripe_subscription_id: string;
  plan_type: "regular_monthly" | "regular_yearly";
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type Props = {
  searchParams: Promise<{
    saved?: string;
    stripe?: string;
    portal?: string;
  }>;
};

const PLAN_LABEL: Record<Subscription["plan_type"], string> = {
  regular_monthly: "月額 480円",
  regular_yearly: "年額 4,800円",
};

export default async function MyPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { saved, stripe, portal } = await searchParams;

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

  const { data: subData } = await supabase
    .from("subscriptions")
    .select(
      "stripe_subscription_id, plan_type, status, current_period_end, cancel_at_period_end",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const subscription = subData as Subscription | null;

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
      {stripe === "success" && (
        <div className="mt-4 rounded-lg border border-primary/40 bg-muted/40 p-3 text-sm">
          正会員への切り替えが完了しました。ご登録ありがとうございます。
        </div>
      )}
      {stripe === "canceled" && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          決済をキャンセルしました。気が向いたときにまたどうぞ。
        </div>
      )}
      {portal === "nocustomer" && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          まだ決済情報が登録されていません。正会員になると管理画面が利用できます。
        </div>
      )}

      {/* 無料会員、正会員へのアップグレード案内 */}
      {rank === "member" && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="font-bold">正会員になる</h2>
          <p className="mt-2 text-sm text-foreground/80">
            全12カテゴリを自由に閲覧・投稿できます。介護・夫婦・健康・お金などの話題に加え、将来的にオフ会やメッセージも利用できます。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <form action="/api/stripe/checkout?plan=monthly" method="post">
              <SubmitButton className="w-full" pendingText="決済画面へ…">
                月額 480円で始める
              </SubmitButton>
            </form>
            <form action="/api/stripe/checkout?plan=yearly" method="post">
              <SubmitButton
                variant="outline"
                className="w-full"
                pendingText="決済画面へ…"
              >
                年額 4,800円（2ヶ月分お得）
              </SubmitButton>
            </form>
          </div>
          <p className="mt-3 text-xs text-foreground/60">
            解約はいつでもこのページから行えます。期間終了まで引き続きご利用いただけます。
          </p>
        </section>
      )}

      {/* 正会員、サブスク状態と管理ボタン */}
      {rank === "regular" && subscription && (
        <section className="mt-8 rounded-lg border border-primary/30 bg-muted/30 p-5">
          <h2 className="font-bold">正会員プラン</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-foreground/70">プラン</dt>
            <dd>{PLAN_LABEL[subscription.plan_type]}</dd>
            <dt className="text-foreground/70">状態</dt>
            <dd>
              {subscription.status === "active"
                ? subscription.cancel_at_period_end
                  ? "期間終了で解約予定"
                  : "有効"
                : subscription.status}
            </dd>
            {subscription.current_period_end && (
              <>
                <dt className="text-foreground/70">次回更新</dt>
                <dd>
                  {new Date(subscription.current_period_end).toLocaleDateString(
                    "ja-JP",
                  )}
                </dd>
              </>
            )}
          </dl>
          <form action="/api/stripe/portal" method="post" className="mt-4">
            <SubmitButton variant="outline" pendingText="移動中…">
              サブスクリプションを管理する
            </SubmitButton>
          </form>
          <p className="mt-3 text-xs text-foreground/60">
            Stripe のお客様ポータルで、プラン変更・支払方法変更・解約ができます。
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold text-lg">プロフィール</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-foreground/70">ニックネーム</dt>
          <dd>{profile?.nickname ?? "未設定"}</dd>
          <dt className="text-foreground/70">誕生日</dt>
          <dd>
            1968年{profile?.birth_month}月{profile?.birth_day}日
          </dd>
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
