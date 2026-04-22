import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

export async function requireUser(): Promise<{ userId: string; profile: Profile }> {
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
}

export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  const result = await requireUser();

  if (result.profile.role !== 'admin') {
    redirect('/dashboard');
  }

  return result;
}
