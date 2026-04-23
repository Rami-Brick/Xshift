import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { timeAsync } from '@/lib/perf/timing';
import { homePathForRole, isStaffRole } from '@/lib/auth/roles';
import type { Profile } from '@/types';

async function requireUserInternal(): Promise<{ userId: string; profile: Profile }> {
  return timeAsync('auth.requireUser', async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      redirect('/login');
    }

    return { userId: user.id, profile: profile as Profile };
  });
}

export async function requireUser(): Promise<{ userId: string; profile: Profile }> {
  return requireUserInternal();
}

export const requireUserCached = cache(requireUserInternal);

async function requireStaffInternal(
  loadUser: () => Promise<{ userId: string; profile: Profile }>,
): Promise<{ userId: string; profile: Profile }> {
  const result = await loadUser();

  if (!isStaffRole(result.profile.role)) {
    redirect('/dashboard');
  }

  return result;
}

export async function requireStaff(): Promise<{ userId: string; profile: Profile }> {
  return requireStaffInternal(requireUser);
}

export const requireStaffCached = cache(async () => requireStaffInternal(requireUserCached));

async function requireAdminInternal(
  loadUser: () => Promise<{ userId: string; profile: Profile }>,
): Promise<{ userId: string; profile: Profile }> {
  const result = await loadUser();

  if (result.profile.role !== 'admin') {
    redirect(homePathForRole(result.profile.role));
  }

  return result;
}

export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  return requireAdminInternal(requireUser);
}

export const requireAdminCached = cache(async () => requireAdminInternal(requireUserCached));
