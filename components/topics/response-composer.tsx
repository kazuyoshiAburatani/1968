import { postTopicResponse } from "@/app/topics/actions";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";
import { SubmitButton } from "@/components/submit-button";
import { PhotoPicker } from "@/components/photo-picker";

// お題への回答入力欄。
//
// 検証を踏まえた設計、
//  ・ゲストにも最初から入力欄を開いておく。「登録してから書け」と言われた瞬間に離脱する
//  ・書いたものは席づくりの間クッキーに預かり、席ができたら自動で投稿する
//  ・穴埋め形式のときは、回答例をプレースホルダに出す。具体例があるほど筆が動く
//  ・「あとから消せます」を明記する。慎重な人が最初の一歩を出す条件だった
//  ・「長く書かなくていい」と添える。1 行で終わってよいと分かると書き出しやすい
//  ・写真は 1 枚だけ添えられる。ただし席がある人に限る。文章はゲストのまま書ける
//    ので、最初の一歩の軽さは変わらない。写真だけ席を求めるのは、
//    荒らされたときに辿れないと運営がひとりの場では対処しきれないため

type Props = {
  topicId: string;
  nickname: string;
  avatarPath: string | null | undefined;
  guest?: boolean;
  /** 'fill_blank' なら穴埋め、'free' なら自由記述 */
  format?: string;
  /** 穴埋めの回答例。プレースホルダに使う */
  examples?: string[];
  returnPath?: string;
  /**
   * 書き込み専用ページで使うときは true。
   * 入力欄を広く取り、送信後の戻り先を呼び出し側に決めてもらう。
   */
  standalone?: boolean;
};

export function ResponseComposer({
  topicId,
  nickname,
  avatarPath,
  guest = false,
  format = "free",
  examples = [],
  returnPath = "/",
  standalone = false,
}: Props) {
  const isFill = format === "fill_blank";

  const placeholder = isFill
    ? examples.length > 0
      ? `例、${examples.slice(0, 2).join(" ／ ")}`
      : "【　】に入る言葉をどうぞ"
    : "思い出したことを、一言どうぞ";

  return (
    <form
      action={postTopicResponse}
      className={
        standalone
          ? "rounded-2xl border border-border/60 bg-background p-4 sm:p-5"
          : "rounded-2xl border border-border/60 bg-background p-3 sm:p-4 shadow-sm"
      }
    >
      <input type="hidden" name="topic_id" value={topicId} />
      <input type="hidden" name="return_path" value={returnPath} />

      <div className="flex items-start gap-3">
        {!guest && (
          <UserAvatar
            name={nickname}
            avatarUrl={publicAvatarUrl(avatarPath)}
            size={40}
          />
        )}
        <div className="flex-1 min-w-0">
          <textarea
            name="body"
            rows={standalone ? 6 : isFill ? 2 : 3}
            maxLength={1000}
            required
            placeholder={placeholder}
            className="w-full resize-y rounded-lg border border-border bg-page px-3 py-2 text-base leading-8 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {isFill && examples.length > 0 && (
            <p className="mt-1.5 text-xs leading-6 text-foreground/60">
              こんな答えでも十分です、
              {examples.slice(0, 3).join("／")}
            </p>
          )}

          <PhotoPicker
            name="photo"
            enabled={!guest}
            joinHref={`/join?next=${encodeURIComponent(returnPath)}`}
            label="写真を添える"
            className="mt-2.5"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs leading-6 text-foreground/60">
              {guest
                ? "書いたあと、ニックネームと生まれた日だけ伺います（30秒）。文章はそのまま残ります。"
                : "一行で十分です。書いたものは、あとから自分で消せます。"}
            </p>
            <SubmitButton className="min-h-[var(--spacing-tap)] px-6 rounded-full bg-primary text-white text-base font-bold hover:opacity-90">
              {guest ? "書いてみる" : "送る"}
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
