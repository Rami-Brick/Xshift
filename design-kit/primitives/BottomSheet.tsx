'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  title?: string;
  className?: string;
}

export function BottomSheet({ open, onClose, children, ariaLabel, title, className }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? ariaLabel}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-canvas rounded-t-xl shadow-soft',
          'max-h-[85vh] overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
          open ? 'translate-y-0' : 'translate-y-full',
          className,
        )}
      >
        <div className="flex justify-center pt-2 pb-1">
          <span className="h-1 w-9 rounded-pill bg-soft" aria-hidden="true" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-soft">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft transition"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
