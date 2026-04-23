export default function DayOffLoading() {
  return (
    <div className="space-y-4 px-4 pt-5 pb-4 animate-pulse">
      <div className="h-7 w-32 rounded bg-soft" />
      <div className="bg-surface rounded-xl px-4 py-4 h-20 shadow-softer" />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl px-4 py-4 h-20 shadow-softer" />
        <div className="bg-surface rounded-xl px-4 py-4 h-20 shadow-softer" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl px-4 py-3 h-16 shadow-softer" />
        ))}
      </div>
    </div>
  );
}
