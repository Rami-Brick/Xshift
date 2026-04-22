import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-8 text-center">
      <p className="text-5xl font-bold text-ink mb-2">404</p>
      <p className="text-muted text-sm mb-6">Page introuvable</p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
