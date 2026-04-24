import type { Metadata, Viewport } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xshift — Gestion des présences',
  description: "Application de gestion des présences et des congés.",
  manifest: '/manifest.webmanifest',
  applicationName: 'Xshift',
  icons: {
    icon: '/Xshift.svg',
    shortcut: '/Xshift.svg',
    apple: '/Xshift.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Xshift',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#1E53FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
