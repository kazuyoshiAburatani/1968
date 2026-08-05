import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { SubmitButton } from "@/components/submit-button";
import { leaveCommunity } from "./actions";

export const metadata: Metadata = {
  title: "退会について",
  robots: { index: false },
};

// 退会。
// 引き止めのための遠回りな導線は置かない。
// ただし「書いたものがどうなるか」だけは、はっきり伝える。
export default async function LeavePage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold">退会について</h1>

      <p className="mt-4 text-base leading-8 text-foreground/80">
        いつでも退会できます。手続きは、この下のボタン一つです。
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <h2 className="text-base font-bold">退会するとどうなるか</h2>
        <ul className="mt-2 space-y-2 text-sm leading-7 text-foreground/80">
          <li>
            あなたが書いた投稿と返信は、すべて消えます。返信の下についていた会話も、
            あなたの分だけ抜けた形になります。
          </li>
          <li>
            ニックネーム、プロフィール写真、投票の記録も消えます。
          </li>
          <li>
            消したものは元に戻せません。残しておきたい文章があれば、
            先に手元へ控えてください。
          </li>
        </ul>
      </div>

      <p className="mt-6 text-sm leading-7 text-foreground/70">
        投稿を 1 つだけ消したいのであれば、その投稿の「消す」から個別に消せます。
        退会しなくても大丈夫です。
      </p>

      <form action={leaveCommunity} className="mt-6">
        <label className="flex items-start gap-2 text-sm leading-7">
          <input
            type="checkbox"
            name="confirm"
            required
            className="mt-1.5 size-5"
          />
          <span>
            書いたものがすべて消えることを理解したうえで、退会します
          </span>
        </label>
        <SubmitButton
          variant="outline"
          className="mt-4 w-full min-h-[52px] rounded-full border-2 border-notification text-notification font-bold hover:bg-notification hover:text-white"
        >
          退会する
        </SubmitButton>
      </form>

      <Link
        href="/mypage"
        className="mt-6 inline-block text-sm no-underline hover:underline"
      >
        ← マイページへ戻る
      </Link>
    </div>
  );
}
