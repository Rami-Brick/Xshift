import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';
import { getAdminStats } from '@/lib/admin/stats';

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  return <AdminDashboardClient initialStats={stats} />;
}
