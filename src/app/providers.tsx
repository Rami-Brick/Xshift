'use client';

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

interface ProvidersProps {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}

export function Providers({ locale, messages, children }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Africa/Tunis">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </NextIntlClientProvider>
  );
}
