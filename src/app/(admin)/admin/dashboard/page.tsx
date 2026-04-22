import { requireAdmin } from '@/lib/auth/guards';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboardPage() {
  await requireAdmin();
  return <AdminDashboardClient />;
}
