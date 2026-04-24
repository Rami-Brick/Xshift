'use client';

import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  detail?: string;
  description?: string;
  confirmLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionDialog({
  title,
  detail,
  description = 'Cette action est irréversible.',
  confirmLabel,
  loadingLabel,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-trend-down/10 flex items-center justify-center">
            <AlertTriangle size={18} className="text-trend-down" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {detail && <p className="text-caption text-muted mt-0.5">{detail}</p>}
          </div>
        </div>
        <p className="text-sm text-muted">{description}</p>
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-soft transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-trend-down text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? loadingLabel ?? confirmLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
