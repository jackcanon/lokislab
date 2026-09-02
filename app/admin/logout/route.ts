import { NextResponse } from 'next/server';
import { ADMIN_PASSWORD_HASH } from '@/lib/admin-auth';

const COOKIE_NAME = 'lokislab_admin_session';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
