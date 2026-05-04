import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, manifest, PWA assets, icons, logo
     * - api routes (handlers enforce auth themselves)
     */
    '/((?!_next/static|_next/image|favicon.svg|favicon.ico|Xshift.svg|icon-sidebar.png|logo-sidebar.png|manifest.webmanifest|sw.js|apple-touch-icon.png|icons/|api/).*)',
  ],
};
