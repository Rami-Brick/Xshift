export default function DashboardLoading() {
  return (
    <div className="px-4 pt-10 pb-2 animate-pulse">
      <div className="min-h-[190px] flex flex-col items-center justify-center">
        <div className="h-3 w-16 rounded bg-soft" />
        <div className="mt-3 h-12 w-40 rounded bg-soft" />
        <div className="mt-4 h-3 w-44 rounded bg-soft" />
      </div>
      <div className="mt-8 bg-surface rounded-xl p-5 h-40 shadow-softer" />
    </div>
  );
}
