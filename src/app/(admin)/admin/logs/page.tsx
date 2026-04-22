import { requireAdmin } from '@/lib/auth/guards';
import { LogsClient } from '@/components/admin/LogsClient';

export default async function AdminLogsPage() {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Journal d&apos;activité</h1>
      <LogsClient />
    </div>
  );
}
