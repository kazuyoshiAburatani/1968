// 読み込み中の場所取り。
//
// 何も出さずに空白のままだと、ページが飛び跳ねて読みづらくなる。
// かといって派手に動くものを置くと目が疲れるので、静かな灰色の枠だけにしてある。
export function SectionSkeleton({
  lines = 3,
  label,
}: {
  lines?: number;
  label?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/60 bg-background p-5"
      aria-busy="true"
      aria-label={label ?? "読み込み中"}
    >
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted"
            style={{ width: `${100 - i * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
