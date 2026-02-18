import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Auth middleware to protect /app/* routes.
 * Unauthenticated users are redirected to /login.
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    // Use the correct cookie name for production
    cookieName: process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
  });

  const isAuthenticated = !!token;
  const pathname = request.nextUrl.pathname;

  // Protected routes: anything under /app/*
  const isProtectedRoute = pathname.startsWith('/app');

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Optionally add a callbackUrl so user is redirected back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all paths under /app/*
     * This protects all authenticated-only routes
     */
    '/app/:path*',
  ],
};
