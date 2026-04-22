export default function HistoryLoading() {
  return (
    <div className="space-y-4 px-4 pt-5 pb-4 animate-pulse">
      <div className="h-7 w-32 rounded bg-soft" />
      <div className="h-10 w-48 rounded-pill bg-soft" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl px-3 py-3 h-16 shadow-softer" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl px-4 py-3 h-16 shadow-softer" />
        ))}
      </div>
    </div>
  );
}
