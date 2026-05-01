import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { MembershipBadge } from "@/components/membership-badge";
import { SubmitButton } from "@/components/submit-button";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUploader } from "@/components/avatar-uploader";
import { publicAvatarUrl } from "@/lib/avatar";

export const metadata: Metadata = {
  title: "マイページ",
};

type Rank = "guest" | "member" | "verified";

type Verification = {
  document_type:
    | "self_declaration"
    | "mynumber"
    | "health_insurance"
    | "driver_license"
    | "passport";
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
};

type SupporterRow = {
  year: number;
  paid_at: string;
  granted_by: "paid" | "founding_grant" | "admin_grant";
};

type Props = {
  searchParams: Promise<{
    saved?: string;
    stripe?: string;
    error?: string;
  }>;
};

const CURRENT_YEAR_TOKYO = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
).getFullYear();

export default async function MyPage({ searchParams }: Props) {
  const { supabase, user } = await requireSession();
  const { saved, stripe, error } = await searchParams;

  const { data: publicUser } = await supabase
    .from("users")
    .select(
      "email, membership_rank, status, verified, is_founding_member, founding_member_since, created_at",
    )
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

  const { data: supRows } = await supabase
    .from("supporters")
    .select("year, paid_at, granted_by")
    .eq("user_id", user.id)
    .order("year", { ascending: false });
  const supporters = (supRows ?? []) as SupporterRow[];
  const isCurrentSupporter = supporters.some(
    (s) => s.year === CURRENT_YEAR_TOKYO,
  );

  const verified = publicUser?.verified === true;
  const rank = (publicUser?.membership_rank ?? "guest") as Rank;
  const isFoundingMember = publicUser?.is_founding_member === true;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">マイページ</h1>
        <MembershipBadge
          rank={rank}
          isFoundingMember={isFoundingMember}
          isCurrentSupporter={isCurrentSupporter}
        />
      </header>

      {/* プロフィール写真 */}
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
      {stripe === "supporter_success" && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
          ご支援、誠にありがとうございます。{CURRENT_YEAR_TOKYO} 応援団の称号が付与されました。
        </div>
      )}
      {stripe === "canceled" && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          決済をキャンセルしました。気が向いたときにまたどうぞ。
        </div>
      )}

      {/* 1968 認証ステータス */}
      <section className="mt-8 rounded-2xl border border-border bg-background p-5">
        <h2 className="font-bold flex items-center gap-2">
          <i className="ri-shield-check-line text-xl text-primary" aria-hidden />
          1968 認証
        </h2>
        {verified ? (
          <div className="mt-3 text-sm">
            <p className="text-emerald-800 font-medium">
              ✓ 1968 認証済（{verification?.verified_at &&
                new Date(verification.verified_at).toLocaleDateString("ja-JP")}）
            </p>
            <p className="mt-2 text-foreground/70">
              全カテゴリの閲覧・投稿、ダイレクトメッセージ、オフ会への参加ができます。
            </p>
          </div>
        ) : verification?.status === "pending" ? (
          <div className="mt-3 text-sm">
            <p className="text-amber-900 font-medium">審査中です</p>
            <p className="mt-1 text-foreground/70">
              通常 1〜3 営業日以内に運営から結果のご連絡をお送りします。
            </p>
          </div>
        ) : verification?.status === "rejected" ? (
          <div className="mt-3 text-sm">
            <p className="text-red-900 font-medium">
              却下されました
              {verification.rejection_reason
                ? `、${verification.rejection_reason}`
                : ""}
            </p>
            <p className="mt-3">
              <Link
                href="/mypage/verification"
                className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border no-underline hover:bg-muted text-sm"
              >
                再申請する
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-3 text-sm">
            <p className="text-foreground/80 leading-7">
              認証すると <strong>段階B 以降のカテゴリへの投稿</strong>、
              <strong>段階C・D の閲覧</strong>、<strong>DM</strong>、
              <strong>オフ会参加</strong> ができます。
              5 分の誓約フォームのみ・身分証の画像提出は不要です。
            </p>
            <p className="mt-4">
              <Link
                href="/mypage/verification"
                className="inline-flex items-center justify-center min-h-[var(--spacing-tap)] px-5 rounded-full bg-primary text-white text-sm font-medium no-underline active:opacity-90"
              >
                1968 認証を受ける →
              </Link>
            </p>
          </div>
        )}
      </section>

      {/* 創設メンバー */}
      {isFoundingMember && (
        <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900 flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              🎖
            </span>
            創設メンバーです
          </h2>
          <p className="mt-2 text-sm text-amber-900/90 leading-7">
            ベータ期間からの応援、本当にありがとうございます。
            {publicUser?.founding_member_since &&
              `（${new Date(publicUser.founding_member_since).toLocaleDateString("ja-JP")} 〜）`}
            創設メンバー専用ラウンジ・将来の書籍贈呈・新機能ファーストアクセス等の特典が永久に付帯します。
          </p>
        </section>
      )}

      {/* 応援団（年次サポーター） */}
      <section className="mt-6 rounded-2xl border border-rose-200 bg-background p-5">
        <h2 className="font-bold flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🌸
          </span>
          1968 を応援する（応援団）
        </h2>
        {isCurrentSupporter ? (
          <div className="mt-3 text-sm">
            <p className="text-rose-900 font-medium">
              ✓ {CURRENT_YEAR_TOKYO} 応援団の称号がついています
            </p>
            <p className="mt-2 text-foreground/70 leading-7">
              ご支援、ありがとうございます。応援団ラウンジ、オフ会優先抽選、年始の油谷からのご挨拶などの特典をお楽しみください。
            </p>
            {supporters.length > 1 && (
              <details className="mt-3 text-xs text-foreground/70">
                <summary className="cursor-pointer">過去の応援履歴を見る</summary>
                <ul className="mt-2 space-y-1">
                  {supporters.map((s) => (
                    <li key={s.year}>
                      {s.year} 年応援団（
                      {s.granted_by === "paid"
                        ? "ご支援"
                        : s.granted_by === "founding_grant"
                          ? "創設メンバー進呈"
                          : "運営付与"}
                      、{new Date(s.paid_at).toLocaleDateString("ja-JP")}）
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm">
            <p className="text-foreground/80 leading-7">
              一回 <strong>3,000 円</strong> のご支援で、その年の{" "}
              <strong>「{CURRENT_YEAR_TOKYO} 応援団」</strong> 称号がつきます。
              定期支払いではなく単発、来年も支援したいときだけまたどうぞ。
            </p>
            <ul className="mt-3 text-xs text-foreground/70 space-y-1.5 list-disc pl-5 leading-6">
              <li>応援団バッジ（プロフィール・投稿に表示）</li>
              <li>応援団ラウンジ（限定スレッドへのアクセス）</li>
              <li>オフ会の優先抽選</li>
              <li>タイムラインでの優先表示</li>
              <li>年始の油谷からの個別お礼メッセージ</li>
            </ul>
            <p className="mt-3 text-xs text-foreground/60">
              ※ 機能差はありません、純粋な応援としてのお支払いです。サイトの運営費に充てます。
            </p>
            <form action="/api/stripe/checkout" method="post" className="mt-4">
              <SubmitButton className="w-full" pendingText="決済画面へ…">
                3,000 円で {CURRENT_YEAR_TOKYO} 応援団になる
              </SubmitButton>
            </form>
          </div>
        )}
      </section>

      <section className="mt-10">
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
