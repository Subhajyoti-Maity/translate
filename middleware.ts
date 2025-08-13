import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle Socket.io connections
  if (request.nextUrl.pathname.startsWith('/api/socket')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/socket/:path*',
  ],
};
