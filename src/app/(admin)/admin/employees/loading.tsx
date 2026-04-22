export default function EmployeesLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-32 rounded bg-soft" />
      <div className="flex gap-3">
        <div className="flex-1 h-10 rounded-pill bg-soft" />
        <div className="h-10 w-36 rounded-xl bg-soft" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl px-4 py-3 h-16 shadow-softer" />
        ))}
      </div>
    </div>
  );
}
