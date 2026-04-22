export default function DashboardLoading() {
  return (
    <div className="space-y-5 px-4 pt-5 pb-2 animate-pulse">
      <div className="space-y-1">
        <div className="h-3 w-16 rounded bg-soft" />
        <div className="h-7 w-32 rounded bg-soft" />
        <div className="h-3 w-40 rounded bg-soft" />
      </div>
      <div className="bg-surface rounded-xl p-5 h-40 shadow-softer" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-4 h-20 shadow-softer" />
        ))}
      </div>
    </div>
  );
}
