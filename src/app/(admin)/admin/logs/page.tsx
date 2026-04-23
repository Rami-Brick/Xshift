import { LogsClient } from '@/components/admin/LogsClient';
import { requireAdminCached } from '@/lib/auth/guards';

export default async function AdminLogsPage() {
  await requireAdminCached();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Journal d&apos;activité</h1>
      <LogsClient />
    </div>
  );
}
