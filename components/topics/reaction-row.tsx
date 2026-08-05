import { toggleReaction } from "@/app/topics/actions";
import {
  REACTION_META,
  REACTION_TYPES,
  type ReactionType,
} from "@/lib/reactions";

// リアクション 6 種。クライアント JS 無しで動くよう form + submit で組む。
// 文章を書く気力が残っていない人にとって、これが唯一の参加手段になる。
// 押した数はその場に出るが、誰が押したかは本人以外に見せない。

type Props = {
  targetId: string;
  counts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
  returnPath?: string;
};

export function ReactionRow({
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
            <input type="hidden" name="target_id" value={targetId} />
            <input type="hidden" name="reaction_type" value={rt} />
            <input type="hidden" name="return_path" value={returnPath} />
            <button
              type="submit"
              aria-label={`${REACTION_META[rt].label}${active ? "（解除）" : ""}`}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-colors border " +
                (active
                  ? "bg-primary/10 border-primary/40 text-primary font-bold"
                  : "bg-background border-border text-foreground/70 hover:bg-muted")
              }
            >
              <span aria-hidden className="text-base">
                {REACTION_META[rt].emoji}
              </span>
              <span className="hidden sm:inline">{REACTION_META[rt].label}</span>
              {count > 0 && <span className="tabular-nums">{count}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}
