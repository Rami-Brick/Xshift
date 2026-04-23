import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminCached } from '@/lib/auth/guards';
import { timeAsync } from '@/lib/perf/timing';
import { SettingsForm } from '@/components/admin/SettingsForm';
import type { OfficeSettings } from '@/types';

export default async function AdminSettingsPage() {
  await requireAdminCached();
  const service = createServiceClient();

  const { data } = await timeAsync('page.admin.settings.data', () =>
    service.from('office_settings').select('*').single(),
  );
  const settings = data as OfficeSettings | null;

  if (!settings) {
    return (
      <div className="p-4 text-trend-down">
        Paramètres introuvables — vérifiez que la migration 0002_seed.sql a été exécutée.
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Paramètres du bureau</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
