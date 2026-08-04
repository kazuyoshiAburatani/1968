import { postTopicResponse } from "@/app/topics/actions";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";

// お題への短文回答入力欄。
// スレッドの新規作成と違い、タイトル無し・本文だけ。
// 200 字を目安に、上限 1000 字。プレースホルダーで気軽さを演出。

type Props = {
  topicId: string;
  nickname: string;
  avatarPath: string | null | undefined;
  // ログインしていない場合はログイン導線に切り替える
  guest?: boolean;
};

export function ResponseComposer({
  topicId,
  nickname,
  avatarPath,
  guest = false,
}: Props) {
  if (guest) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-center">
        <p className="text-foreground/70 mb-3">
          お題に一言、答えるには会員登録（無料）が必要です。
        </p>
        <a
          href="/register"
          className="inline-flex items-center px-5 py-2 rounded-full bg-primary text-white text-sm font-medium no-underline hover:opacity-90"
        >
          会員登録（無料）
        </a>
      </div>
    );
  }

  return (
    <form
      action={postTopicResponse}
      className="rounded-2xl border border-border/60 bg-background p-3 sm:p-4 shadow-sm"
    >
      <input type="hidden" name="topic_id" value={topicId} />
      <div className="flex items-start gap-3">
        <UserAvatar
          name={nickname}
          avatarUrl={publicAvatarUrl(avatarPath)}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <textarea
            name="body"
            rows={2}
            maxLength={1000}
            required
            placeholder="このお題について、一言どうぞ"
            className="w-full resize-y rounded-lg border border-border bg-page px-3 py-2 text-sm sm:text-base leading-7 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-foreground/50">
              長く書かなくて OK、思いついたことだけで
            </p>
            <button
              type="submit"
              className="inline-flex items-center min-h-[36px] px-5 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90"
            >
              投稿
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
