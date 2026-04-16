export function ItemsLoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-[var(--bg-card)] p-3 flex items-center gap-3 animate-pulse"
        >
          <div className="w-16 h-16 rounded-xl bg-[var(--bg-secondary)] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[var(--bg-secondary)] rounded-lg w-3/4" />
            <div className="h-3 bg-[var(--bg-secondary)] rounded-lg w-1/2" />
          </div>
          <div className="space-y-2 items-end flex flex-col shrink-0">
            <div className="h-4 bg-[var(--bg-secondary)] rounded-lg w-16" />
            <div className="h-3 bg-[var(--bg-secondary)] rounded-lg w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
