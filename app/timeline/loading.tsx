export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-6 sm:py-10">
      <header className="px-4 sm:px-0">
        <div className="h-8 w-44 bg-muted rounded animate-pulse" />
        <div className="mt-2 h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
      </header>
      <ul className="mt-6 divide-y divide-border border-y border-border bg-background sm:rounded-xl sm:border">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="px-4 py-4 space-y-2" aria-hidden>
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
            </div>
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-full bg-muted/60 rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
