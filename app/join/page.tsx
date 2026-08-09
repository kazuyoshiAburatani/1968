import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FOUNDING_LABEL, isFoundingWindow } from "@/lib/launch";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { joinAnonymously } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "席をつくる",
  description:
    "ニックネームと生年月日だけ。メールアドレスもパスワードも要りません。30秒で書き込めるようになります。",
};

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function JoinPage({ searchParams }: Props) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile) redirect("/");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
        席をつくる
      </h1>
      <p className="mt-3 text-base leading-8 text-foreground/80">
        ニックネームと生まれた日だけ教えてください。
        <br />
        メールアドレスも、パスワードも要りません。
      </p>

      <ul className="mt-4 space-y-1.5 text-sm text-foreground/70">
        <li className="flex gap-2">
          <i className="ri-check-line text-primary" aria-hidden />
          本名は聞きません。ニックネームはあとから変えられます
        </li>
        <li className="flex gap-2">
          <i className="ri-check-line text-primary" aria-hidden />
          身分証の提出は、ありません
        </li>
        <li className="flex gap-2">
          <i className="ri-check-line text-primary" aria-hidden />
          書いたものは、あとから自分で消せます
        </li>
      </ul>

      {/* 創設メンバーの案内。
          立ち上げ期に最初に入ってくれる人へ渡せるものが、いまはこれしかない。
          締切を過ぎたら自動で消えるので、当日に何かを消す作業は要らない。 */}
      {isFoundingWindow() && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <i
            className="ri-award-line mt-0.5 shrink-0 text-xl text-accent"
            aria-hidden
          />
          <p className="text-sm leading-7 text-foreground/80">
            <span className="font-bold text-foreground">
              いま席をつくった方は「創設メンバー」です。
            </span>
            <br />
            {FOUNDING_LABEL}までに来てくださった方に、名前の横に出る称号が付きます。
            あとから付けることはできません。
          </p>
        </div>
      )}

      {params.error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-notification/40 bg-notification/10 px-4 py-3 text-sm leading-7"
        >
          {params.error}
        </p>
      )}

      <form action={joinAnonymously} className="mt-6 space-y-6">
        <div>
          <label
            htmlFor="nickname"
            className="block text-base font-bold mb-1.5"
          >
            ニックネーム
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            required
            maxLength={30}
            autoComplete="off"
            placeholder="例、博多のヤマちゃん"
            className="w-full min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="mt-1.5 text-xs text-foreground/60">
            投稿にはこの名前が出ます。本名は避けてください。
          </p>
        </div>

        <fieldset>
          <legend className="block text-base font-bold mb-1.5">
            生まれた日
          </legend>
          <div className="flex items-center gap-2">
            <select
              name="birth_year"
              required
              defaultValue="1968"
              aria-label="生まれた年"
              className="min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="1968">1968年</option>
              <option value="1969">1969年</option>
            </select>
            <select
              name="birth_month"
              required
              aria-label="生まれた月"
              className="min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">月</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
            <select
              name="birth_day"
              required
              aria-label="生まれた日"
              className="min-h-[var(--spacing-tap)] rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">日</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}日
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-xs leading-6 text-foreground/60">
            この集まりは、1968年に生まれた学年が対象です。
            <br />
            1969年1月〜4月1日生まれの方（いわゆる早生まれ）も、同じ学年ですのでどうぞ。
          </p>
        </fieldset>

        <SubmitButton className="w-full min-h-[52px] rounded-full bg-primary text-white text-base font-bold hover:opacity-90">
          この内容で席をつくる
        </SubmitButton>
      </form>

      <p className="mt-6 text-sm leading-7 text-foreground/70">
        以前メールアドレスで登録した方は
        <Link href="/login" className="mx-1">
          こちらからログイン
        </Link>
        できます。
      </p>

      <p className="mt-4 text-xs leading-6 text-foreground/60">
        席をつくると
        <Link href="/terms" className="mx-1">
          利用規約
        </Link>
        と
        <Link href="/privacy" className="mx-1">
          プライバシーポリシー
        </Link>
        に同意したことになります。
      </p>
    </div>
  );
}
