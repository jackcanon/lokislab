import { NextResponse, type NextRequest } from 'next/server';
import { prefersMarkdown } from '@/lib/crawlPolicy';
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const htmlOnly = path === '/test' || path.startsWith('/guides/');
  if ((request.method === 'GET' || request.method === 'HEAD') && !htmlOnly && prefersMarkdown(request.headers.get('accept') || '')) {
    const target = request.nextUrl.clone();
    target.pathname = '/api/public-content';
    target.search = '';
    target.searchParams.set('path', path);
    const response = NextResponse.rewrite(target);
    response.headers.set('Vary', 'Accept');
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  const response = NextResponse.next();
  response.headers.set('Vary', 'Accept');
  return response;
}
export const config = {matcher: ['/((?!api(?:/|$)|_next(?:/|$)|publish(?:/|$)|.*\\..*).*)']};
