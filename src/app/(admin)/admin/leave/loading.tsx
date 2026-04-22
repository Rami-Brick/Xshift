export default function AdminLeaveLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-40 rounded bg-soft" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-pill bg-soft" />
        ))}
      </div>
      <div className="bg-surface rounded-xl h-64 shadow-softer" />
    </div>
  );
}
