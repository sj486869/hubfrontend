import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authPresent = request.cookies.get('auth_present')?.value;
  const role = request.cookies.get('user_role')?.value;
  const isLoggedIn = authPresent === 'true';

  // Debug logging
  console.log(`[Middleware] Path: ${pathname} | isLoggedIn: ${isLoggedIn} | Role: ${role}`);

  if (pathname.startsWith('/admin') || pathname.startsWith('/upload')) {
    if (!isLoggedIn) {
      console.log(`[Middleware] Unauthorized, redirecting ${pathname} -> /auth`);
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    if (role !== 'admin') {
      console.log(`[Middleware] Forbidden, redirecting ${pathname} -> /`);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/upload', '/upload/:path*'],
};
