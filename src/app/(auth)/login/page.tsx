'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';
import { loginAction } from './actions';
import { cn } from '@/lib/utils/cn';

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(data: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('email', data.email);
      formData.set('password', data.password);
      const result = await loginAction(formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/Xshift.svg"
            alt="Xshift"
            width={48}
            height={48}
            priority
            className="mr-3 h-12 w-12 rounded-xl object-contain shadow-softer"
          />
          <div>
            <p className="text-xl font-bold text-ink tracking-tight">Xshift</p>
            <p className="text-xs text-muted">Gestion des présences</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-xl shadow-soft p-6">
          <h1 className="text-cardTitle font-semibold text-ink mb-6">Connexion</h1>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-small font-medium text-ink mb-1" htmlFor="email">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2.5 text-body text-ink bg-surface',
                  'placeholder:text-muted outline-none transition',
                  'focus:ring-2 focus:ring-brand focus:border-transparent',
                  errors.email ? 'border-trend-down' : 'border-subtle',
                )}
                placeholder="vous@exemple.com"
              />
              {errors.email && (
                <p className="mt-1 text-small text-trend-down">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-small font-medium text-ink mb-1" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2.5 text-body text-ink bg-surface',
                  'placeholder:text-muted outline-none transition',
                  'focus:ring-2 focus:ring-brand focus:border-transparent',
                  errors.password ? 'border-trend-down' : 'border-subtle',
                )}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-small text-trend-down">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-red-50 border border-trend-down/20 px-3 py-2.5">
                <p className="text-small text-trend-down">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'w-full rounded-lg bg-brand text-white font-semibold text-body py-2.5',
                'transition hover:opacity-90 active:opacity-80',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isPending ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
