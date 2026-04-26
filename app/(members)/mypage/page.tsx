import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { MembershipBadge } from "@/components/membership-badge";
import { SubmitButton } from "@/components/submit-button";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUploader } from "@/components/avatar-uploader";
import { DOCUMENT_TYPE_LABELS } from "@/lib/validation/verification";
import { publicAvatarUrl } from "@/lib/avatar";

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

type Verification = {
  document_type: keyof typeof DOCUMENT_TYPE_LABELS;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
};

type Props = {
  searchParams: Promise<{
    saved?: string;
    stripe?: string;
    portal?: string;
    error?: string;
  }>;
};

const PLAN_LABEL: Record<Subscription["plan_type"], string> = {
  regular_monthly: "月額 480円",
  regular_yearly: "年額 4,800円",
};

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

export default async function MyPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { saved, stripe, portal, error } = await searchParams;

  const { data: publicUser } = await supabase
    .from("users")
    .select("email, membership_rank, status, stripe_customer_id, verified, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, birth_month, birth_day, prefecture, bio_visible, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const avatarUrl = publicAvatarUrl(
    (profile?.avatar_url as string | null | undefined) ?? null,
  );

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

  const { data: verData } = await supabase
    .from("verifications")
    .select(
      "document_type, status, rejection_reason, submitted_at, verified_at",
    )
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const verification = verData as Verification | null;

  const verified = publicUser?.verified === true;
  const rank = (publicUser?.membership_rank ?? "guest") as Rank;
  const hasActiveSub = !!subscription && ACTIVE_SUB_STATUSES.has(subscription.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">マイページ</h1>
        <MembershipBadge rank={rank} verified={verified} />
      </header>

      {/* プロフィール写真、大きく表示＋直接アップロード */}
      <section className="mt-6 rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={profile?.nickname ?? "ユーザー"}
            avatarUrl={avatarUrl}
            size={80}
          />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold truncate">
              {profile?.nickname ?? "ゲスト"} さん
            </p>
            <p className="mt-0.5 text-xs text-foreground/60">
              {avatarUrl
                ? "プロフィール写真は公開ページや投稿に表示されます"
                : "写真を入れると、より顔の見える交流に。会員登録後に変更可能です。"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <AvatarUploader hasAvatar={!!avatarUrl} />
        </div>
        <p className="mt-2 text-xs text-foreground/60">
          JPEG / PNG / WebP、5 MB 以内。正方形にトリミングされて表示されます。
        </p>
      </section>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-50 p-3 text-sm text-red-900">
          {decodeURIComponent(error)}
        </div>
      )}
      {saved && (
        <div className="mt-4 rounded-lg border border-primary/40 bg-muted/40 p-3 text-sm">
          {saved === "avatar"
            ? "プロフィール写真を更新しました。"
            : saved === "avatar-removed"
              ? "プロフィール写真を削除しました。"
              : "プロフィールを保存しました。"}
        </div>
      )}
      {stripe === "success" && (
        <div className="mt-4 rounded-lg border border-primary/40 bg-muted/40 p-3 text-sm">
          ご決済を受け付けました。あとは身分証の確認が完了次第、正会員機能が利用できるようになります。
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

      {/* 正会員に必要なステップ案内、片方でも未完了の場合に表示 */}
      {(rank !== "regular") && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="font-bold">正会員になるまでのステップ</h2>
          <p className="mt-2 text-sm text-foreground/80">
            「お支払い」と「ご本人確認」の両方が完了すると、全12カテゴリを自由に閲覧・投稿できます。
          </p>

          <ol className="mt-4 space-y-4">
            {/* ステップ 1、お支払い */}
            <li className="flex items-start gap-3">
              <span
                className={`mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  hasActiveSub
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-foreground/60"
                }`}
                aria-hidden
              >
                {hasActiveSub ? "✓" : "1"}
              </span>
              <div className="flex-1">
                <p className="font-medium">月額または年額のお支払い</p>
                {hasActiveSub ? (
                  <p className="mt-1 text-xs text-foreground/70">
                    {subscription && PLAN_LABEL[subscription.plan_type]} で登録済み
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                )}
              </div>
            </li>

            {/* ステップ 2、ご本人確認 */}
            <li className="flex items-start gap-3">
              <span
                className={`mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  verified
                    ? "bg-primary/20 text-primary"
                    : verification?.status === "pending"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-muted text-foreground/60"
                }`}
                aria-hidden
              >
                {verified ? "✓" : "2"}
              </span>
              <div className="flex-1">
                <p className="font-medium">ご本人確認の書類提出</p>
                {verified ? (
                  <p className="mt-1 text-xs text-foreground/70">
                    本人確認済み（{verification?.verified_at &&
                      new Date(verification.verified_at).toLocaleDateString("ja-JP")}）
                  </p>
                ) : verification?.status === "pending" ? (
                  <p className="mt-1 text-xs text-foreground/70">
                    審査中、結果が出るまでしばらくお待ちください。
                  </p>
                ) : verification?.status === "rejected" ? (
                  <div className="mt-1 text-xs">
                    <p className="text-red-900">
                      却下されました
                      {verification.rejection_reason
                        ? `、${verification.rejection_reason}`
                        : ""}
                    </p>
                    <p className="mt-2">
                      <Link
                        href="/mypage/verification"
                        className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border no-underline hover:bg-muted text-sm"
                      >
                        再提出する
                      </Link>
                    </p>
                  </div>
                ) : (
                  <p className="mt-2">
                    <Link
                      href="/mypage/verification"
                      className="inline-flex items-center min-h-[var(--spacing-tap)] px-5 rounded-full border border-border no-underline hover:bg-muted text-sm"
                    >
                      身分証を提出する
                    </Link>
                  </p>
                )}
              </div>
            </li>
          </ol>

          <p className="mt-5 text-xs text-foreground/60">
            身分証は運営の確認担当者のみが閲覧します。承認・却下から30日後に自動で削除されます。
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
                <dt className="text-foreground/70">
                  {subscription.cancel_at_period_end ? "ご利用終了日" : "次回更新"}
                </dt>
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
