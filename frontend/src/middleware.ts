import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('auth_present')?.value === 'true';
  const role = request.cookies.get('user_role')?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') || pathname.startsWith('/upload')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/upload', '/upload/:path*'],
};
