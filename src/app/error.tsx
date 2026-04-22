'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-8 text-center">
      <p className="text-2xl font-bold text-ink mb-2">Une erreur est survenue</p>
      <p className="text-muted text-sm mb-6">{error.message ?? 'Erreur inattendue'}</p>
      <button
        type="button"
        onClick={reset}
        className="px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
      >
        Réessayer
      </button>
    </div>
  );
}
