'use client';

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Toaster } from 'sonner';
import { useEffect, type ReactNode } from 'react';

interface ProvidersProps {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}

export function Providers({ locale, messages, children }: ProvidersProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability should fail quietly if a browser blocks service workers.
    });
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Africa/Tunis">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </NextIntlClientProvider>
  );
}
