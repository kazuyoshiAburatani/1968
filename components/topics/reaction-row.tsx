import { toggleReaction } from "@/app/topics/actions";
import {
  REACTION_META,
  REACTION_TYPES,
  type ReactionType,
} from "@/lib/reactions";

// リアクションボタン 6 種類。各ボタンは form + hidden input + submit の構造で、
// クライアント JS 無しでもトグルできる。Server Action が現在の状態を見て
// 「追加 / 削除 / 上書き」を決める。
//
// props、
// - targetType: 'topic_response' | 'thread' | 'reply'
// - targetId: 対象 ID
// - counts: 各リアクションの現在数（reaction_type → number）
// - myReaction: 自分の現在のリアクション（未反応なら null）
// - returnPath: リロード後の遷移先、既定は "/"

type Props = {
  targetType: "topic_response" | "thread" | "reply";
  targetId: string;
  counts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
  returnPath?: string;
};

export function ReactionRow({
  targetType,
  targetId,
  counts,
  myReaction,
  returnPath = "/",
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_TYPES.map((rt) => {
        const active = myReaction === rt;
        const count = counts[rt] ?? 0;
        return (
          <form key={rt} action={toggleReaction} className="inline-flex">
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <input type="hidden" name="reaction_type" value={rt} />
            <input type="hidden" name="return_path" value={returnPath} />
            <button
              type="submit"
              aria-label={`${REACTION_META[rt].label}${active ? "（解除）" : ""}`}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm transition-colors border " +
                (active
                  ? "bg-primary/10 border-primary/40 text-primary font-medium"
                  : "bg-background border-border text-foreground/70 hover:bg-muted")
              }
            >
              <span aria-hidden className="text-sm sm:text-base">
                {REACTION_META[rt].emoji}
              </span>
              <span className="hidden sm:inline">
                {REACTION_META[rt].label}
              </span>
              {count > 0 && <span className="tabular-nums">{count}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}
