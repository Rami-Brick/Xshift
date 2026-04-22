'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/auth';

export async function loginAction(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: 'Identifiants incorrects. Vérifiez votre e-mail et mot de passe.' };
  }

  // Fetch role to redirect appropriately.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Erreur de connexion. Réessayez.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: 'Votre compte a été désactivé. Contactez l\'administrateur.' };
  }

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  redirect('/dashboard');
}
