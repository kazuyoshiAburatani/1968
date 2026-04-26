export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-4 sm:py-8">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-6 bg-muted rounded animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted/60 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <ul className="divide-y divide-border bg-background">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="flex items-start gap-3 px-4 py-3.5"
            aria-hidden
          >
            <div className="size-12 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted/70 rounded animate-pulse" />
              <div className="h-3 w-full bg-muted/50 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
