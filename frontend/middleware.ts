import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  // Ensure charset is explicit for HTML responses
  if (req.nextUrl.pathname.endsWith('.html') || req.nextUrl.pathname === '/' ) {
    res.headers.set('Content-Type', 'text/html; charset=utf-8');
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
