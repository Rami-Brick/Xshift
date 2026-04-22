import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import type { ActivityAction } from '@/types';

export async function logActivity({
  actorId,
  action,
  targetUserId,
  details = {},
}: {
  actorId: string;
  action: ActivityAction;
  targetUserId?: string;
  details?: Record<string, unknown>;
}) {
  const service = createServiceClient();
  await service.from('activity_logs').insert({
    actor_id: actorId,
    action,
    target_user_id: targetUserId ?? null,
    details,
  });
}
