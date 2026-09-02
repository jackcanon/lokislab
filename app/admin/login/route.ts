import { NextResponse } from 'next/server';
import { hashPassword, ADMIN_PASSWORD_HASH } from '@/lib/admin-auth';

const COOKIE_NAME = 'lokislab_admin_session';

export async function POST(request: Request): Promise<NextResponse> {
  let password = '';

  try {
    const body = (await request.json()) as { password?: string };
    password = body.password?.trim() || '';
  } catch {
    const form = await request.formData();
    password = (form.get('password') as string)?.trim() || '';
  }

  if (!password) {
    return NextResponse.json(
      { error: 'Password required' },
      { status: 400 }
    );
  }

  if (hashPassword(password) !== ADMIN_PASSWORD_HASH) {
    return NextResponse.json(
      { error: 'Incorrect password' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, ADMIN_PASSWORD_HASH, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  return response;
}
