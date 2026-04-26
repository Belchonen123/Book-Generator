export function DashboardGridSkeleton() {
  function CardSkeleton() {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-5 shadow-sm">
        <div className="h-5 w-3/4 animate-pulse rounded bg-editorial-muted/25" />
        <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-editorial-muted/20" />
        <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-editorial-muted/15" />
        <div className="mt-2 flex justify-between gap-4">
          <div className="h-3 w-20 animate-pulse rounded bg-editorial-muted/15" />
          <div className="h-3 w-16 animate-pulse rounded bg-editorial-muted/15" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-9 w-48 animate-pulse rounded bg-editorial-muted/25 sm:h-10 sm:w-64" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="h-4 w-2/3 max-w-xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="flex gap-2 pt-2">
            <div className="h-7 w-24 animate-pulse rounded-full bg-editorial-muted/20" />
            <div className="h-7 w-28 animate-pulse rounded-full bg-editorial-muted/20" />
          </div>
        </div>
        <div className="h-10 w-32 shrink-0 animate-pulse rounded-md bg-gold/20" />
      </div>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectWorkspaceSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-editorial-bg">
      <div className="border-b border-border/60 bg-card/40 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-editorial-muted/25 sm:h-10 sm:w-10" />
              {i < 7 ? (
                <div className="mx-0.5 h-0.5 min-w-[10px] flex-1 animate-pulse rounded-full bg-editorial-muted/20 sm:mx-1" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-16 shrink-0 flex-col border-r border-border/70 bg-card/50 lg:w-[240px]">
          <div className="border-b border-border/60 px-2 py-4 lg:px-4">
            <div className="mx-auto h-6 w-16 animate-pulse rounded bg-editorial-muted/25 lg:w-32" />
          </div>
          <div className="space-y-2 px-2 py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 lg:px-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-editorial-muted/25" />
                <div className="hidden h-4 flex-1 animate-pulse rounded bg-editorial-muted/20 lg:block" />
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-border/60 p-2 lg:p-3">
            <div className="mx-auto h-9 w-9 animate-pulse rounded-full bg-editorial-muted/25" />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-6">
          <div className="mx-auto mb-6 h-8 w-2/3 max-w-md animate-pulse rounded bg-editorial-muted/20" />
          <div className="mx-auto h-4 w-full max-w-2xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="mx-auto mt-3 h-4 w-5/6 max-w-2xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="mx-auto mt-8 min-h-[280px] w-full max-w-3xl animate-pulse rounded-xl bg-editorial-muted/10" />
        </div>
      </div>
    </div>
  );
}

export function SimplePageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-editorial-muted/25" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-editorial-muted/15" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-editorial-muted/15" />
      <div className="mt-8 min-h-[320px] animate-pulse rounded-xl bg-editorial-muted/10" />
    </div>
  );
}
