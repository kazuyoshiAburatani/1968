// 掲示板トップ遷移時に即座に表示する軽量スケルトン。
// データ取得を待たずに「ページが切り替わった」感を出して体感速度を上げる。
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-6 sm:py-10">
      <header className="px-4 sm:px-0">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="mt-2 h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
      </header>
      {[0, 1, 2, 3].map((tier) => (
        <section key={tier} className="mt-8">
          <div className="px-4 sm:px-0 h-5 w-24 bg-muted/70 rounded animate-pulse" />
          <ul className="mt-3 divide-y divide-border border-y border-border bg-background sm:rounded-xl sm:border">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-4 py-3.5"
                aria-hidden
              >
                <div className="size-12 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-full bg-muted/60 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
