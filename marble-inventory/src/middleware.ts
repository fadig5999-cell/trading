import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await getSessionFromCookie(request);
  const isAuthPage = request.nextUrl.pathname === '/login';
  const isPublicPage = request.nextUrl.pathname === '/';
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');

  if (!session && !isAuthPage && !isPublicPage && !isApiAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

async function getSessionFromCookie(request: NextRequest) {
  const token = request.cookies.get('marble-session')?.value;
  if (!token) return null;

  try {
    const { jwtVerify } = await import('jose');
    const SECRET = new TextEncoder().encode(
      process.env.AUTH_SECRET || 'marble-inventory-secret-key-change-in-production'
    );
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
